import "server-only";
import { cache } from "react";
import { ATTACHMENT_BUCKET } from "@/lib/env";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKETS_PAGE_SIZE,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  StaffProfile,
  TicketActivity,
  TicketAttachment,
  TicketDetail,
  TicketListItem,
  TicketNote,
} from "@/lib/types";

const LIST_COLUMNS = `
  id, ticket_number, title, requester_name, requester_email, priority, status,
  created_at, updated_at,
  department:departments(name),
  category:categories(name, icon),
  location:locations(name),
  assignee:profiles!tickets_assigned_to_fkey(id, full_name)
`;

export type TicketFilters = {
  q?: string;
  status?: TicketStatus | "active" | "all";
  priority?: TicketPriority;
  category?: string;
  department?: string;
  assignee?: string; // profile id | "unassigned" | "me"
  sort?: "newest" | "oldest" | "priority" | "updated";
  page?: number;
};

const isUuid = (v?: string) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Parse untrusted search params into a safe filter object. */
export function parseTicketFilters(params: Record<string, string | string[] | undefined>) {
  const get = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const status = get("status");
  const priority = get("priority");
  const sort = get("sort");
  const assignee = get("assignee");
  const page = Number.parseInt(get("page") ?? "1", 10);

  return {
    q: get("q")?.slice(0, 100),
    status:
      status === "all" || status === "active" || TICKET_STATUSES.includes(status as TicketStatus)
        ? (status as TicketFilters["status"])
        : "active",
    priority: TICKET_PRIORITIES.includes(priority as TicketPriority)
      ? (priority as TicketPriority)
      : undefined,
    category: isUuid(get("category")) ? get("category") : undefined,
    department: isUuid(get("department")) ? get("department") : undefined,
    assignee:
      assignee === "unassigned" || assignee === "me" || isUuid(assignee) ? assignee : undefined,
    sort: (["newest", "oldest", "priority", "updated"] as const).includes(
      sort as NonNullable<TicketFilters["sort"]>,
    )
      ? (sort as TicketFilters["sort"])
      : "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  } satisfies TicketFilters;
}

export async function listTickets(filters: TicketFilters, currentUserId: string) {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * TICKETS_PAGE_SIZE;

  let query = supabase.from("tickets").select(LIST_COLUMNS, { count: "exact" });

  if (filters.status === "active") query = query.in("status", ["open", "in_progress", "on_hold"]);
  else if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.department) query = query.eq("department_id", filters.department);
  if (filters.assignee === "unassigned") query = query.is("assigned_to", null);
  else if (filters.assignee === "me") query = query.eq("assigned_to", currentUserId);
  else if (filters.assignee) query = query.eq("assigned_to", filters.assignee);

  if (filters.q) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const term = filters.q.replace(/[%,()*\\:."']/g, " ").trim();
    if (term) {
      query = query.or(
        ["ticket_number", "title", "requester_name", "requester_email"]
          .map((col) => `${col}.ilike.%${term}%`)
          .join(","),
      );
    }
  }

  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "updated":
      query = query.order("updated_at", { ascending: false });
      break;
    case "priority":
      // Enum order is low → critical, so descending puts critical first.
      query = query.order("priority", { ascending: false }).order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query
    .range(from, from + TICKETS_PAGE_SIZE - 1)
    .returns<TicketListItem[]>();

  if (error) throw new Error(error.message);
  return { tickets: data ?? [], total: count ?? 0, page, pageSize: TICKETS_PAGE_SIZE };
}

export async function getTicket(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      `${LIST_COLUMNS}, requester_phone, room, description, assigned_to,
       first_response_at, resolved_at, closed_at`,
    )
    .eq("id", id)
    .maybeSingle<TicketDetail>();

  if (error) throw new Error(error.message);
  if (!ticket) return null;

  const [attachments, notes, activity] = await Promise.all([
    supabase
      .from("ticket_attachments")
      .select("id, file_name, file_path, mime_type, size_bytes, created_at")
      .eq("ticket_id", id)
      .order("created_at")
      .returns<Omit<TicketAttachment, "url">[]>(),
    supabase
      .from("ticket_notes")
      .select("id, body, created_at, author:profiles(id, full_name)")
      .eq("ticket_id", id)
      .order("created_at")
      .returns<TicketNote[]>(),
    supabase
      .from("ticket_activity")
      .select("id, action, from_value, to_value, created_at, actor:profiles(full_name)")
      .eq("ticket_id", id)
      .order("created_at")
      .returns<TicketActivity[]>(),
  ]);

  // Short-lived signed URLs; files the requester never finished uploading
  // simply come back without a URL.
  const files = attachments.data ?? [];
  let signed: { path: string | null; signedUrl: string | null; error: string | null }[] = [];
  if (files.length) {
    const { data } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrls(
        files.map((f) => f.file_path),
        60 * 10,
      );
    signed = (data ?? []).map((d) => ({
      path: d.path,
      signedUrl: d.signedUrl,
      error: d.error,
    }));
  }

  const withUrls: TicketAttachment[] = files.map((file) => {
    const match = signed.find((s) => s.path === file.file_path);
    return { ...file, url: match && !match.error ? match.signedUrl : null };
  });

  return {
    ticket,
    attachments: withUrls,
    notes: notes.data ?? [],
    activity: activity.data ?? [],
  };
}

export async function getStaffMembers(): Promise<StaffProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .order("full_name")
    .returns<StaffProfile[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Counts for the sidebar / tabs. */
export const getTicketCounts = cache(async (currentUserId: string) => {
  const supabase = await createClient();
  const count = (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) =>
    build(base()).then(({ count }) => count ?? 0);
  const base = () => supabase.from("tickets").select("id", { count: "exact", head: true });

  const [active, unassigned, mine] = await Promise.all([
    count((q) => q.in("status", ["open", "in_progress", "on_hold"])),
    count((q) => q.in("status", ["open", "in_progress", "on_hold"]).is("assigned_to", null)),
    count((q) => q.in("status", ["open", "in_progress", "on_hold"]).eq("assigned_to", currentUserId)),
  ]);
  return { active, unassigned, mine };
});
