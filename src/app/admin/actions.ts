"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorize } from "@/lib/auth";
import { LOOKUPS_TAG } from "@/lib/data/lookups";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult, LookupKind } from "@/lib/types";
import {
  loginSchema,
  lookupSchema,
  noteSchema,
  staffCreateSchema,
  ticketUpdateSchema,
} from "@/lib/validations";

const fail = (error: string, fieldErrors?: Record<string, string[] | undefined>) =>
  ({ ok: false, error, fieldErrors }) as const;
const done = <T = null>(data: T = null as T) => ({ ok: true, data }) as const;

const uuid = z.string().uuid();
const lookupKind = z.enum(["departments", "categories", "locations"]);

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

export async function signIn(input: unknown, next?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail("Supabase is not configured for this deployment.");

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Check your details.", z.flattenError(parsed.error).fieldErrors);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return fail("Incorrect email or password.");

  // Signing in is not enough — the account must belong to active IT staff.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle<{ is_active: boolean }>();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return fail("This account does not have access to the IT Support admin portal.");
  }

  const target = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  redirect(target);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* -------------------------------------------------------------------------- */
/*  Tickets                                                                   */
/* -------------------------------------------------------------------------- */

export async function updateTicket(input: unknown): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return fail(auth.error);

  const parsed = ticketUpdateSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid update.");
  const { ticketId, status, priority, assignedTo } = parsed.data;

  const patch: Record<string, unknown> = {};
  if (status) patch.status = status;
  if (priority) patch.priority = priority;
  if (assignedTo !== undefined) patch.assigned_to = assignedTo;
  if (!Object.keys(patch).length) return done();

  const supabase = await createClient();
  const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);
  if (error) return fail("Could not update the ticket.");

  refresh();
  return done();
}

export async function deleteTicket(ticketId: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(ticketId).success) return fail("Invalid ticket.");

  const supabase = await createClient();
  const { data: files } = await supabase
    .from("ticket_attachments")
    .select("file_path")
    .eq("ticket_id", ticketId)
    .returns<{ file_path: string }[]>();
  if (files?.length) {
    await supabase.storage.from("ticket-attachments").remove(files.map((f) => f.file_path));
  }

  const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
  if (error) return fail("Could not delete the ticket.");
  redirect("/admin/tickets");
}

export async function addNote(input: unknown): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return fail(auth.error);

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid note.");

  const supabase = await createClient();
  const { error } = await supabase.from("ticket_notes").insert({
    ticket_id: parsed.data.ticketId,
    body: parsed.data.body,
    author_id: auth.profile.id,
  });
  if (error) return fail("Could not save the note.");

  refresh();
  return done();
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(noteId).success) return fail("Invalid note.");

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("ticket_notes")
    .delete({ count: "exact" })
    .eq("id", noteId);
  if (error || !count) return fail("You can only delete your own notes.");

  refresh();
  return done();
}

/* -------------------------------------------------------------------------- */
/*  Settings: departments, categories, locations                              */
/* -------------------------------------------------------------------------- */

function lookupError(message?: string) {
  if (message?.includes("duplicate")) return fail("An item with that name already exists.");
  return fail("Could not save the change.");
}

export async function createLookup(kind: LookupKind, input: unknown): Promise<ActionResult> {
  const auth = await authorize("admin");
  if (!auth.ok) return fail(auth.error);
  if (!lookupKind.safeParse(kind).success) return fail("Invalid list.");

  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return fail("Check the name.", z.flattenError(parsed.error).fieldErrors);

  const supabase = await createClient();
  const { data: last } = await supabase
    .from(kind)
    .select("sort_order")
    .lt("sort_order", 99)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const row: Record<string, unknown> = {
    name: parsed.data.name,
    sort_order: (last?.sort_order ?? 0) + 1,
  };
  if (kind === "categories") row.icon = parsed.data.icon || "circle-help";

  const { error } = await supabase.from(kind).insert(row);
  if (error) return lookupError(error.message);

  updateTag(LOOKUPS_TAG);
  refresh();
  return done();
}

const lookupPatch = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  icon: z.string().trim().max(40).optional(),
  is_active: z.boolean().optional(),
});

export async function updateLookup(
  kind: LookupKind,
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const auth = await authorize("admin");
  if (!auth.ok) return fail(auth.error);
  if (!lookupKind.safeParse(kind).success || !uuid.safeParse(id).success) return fail("Invalid item.");

  const parsed = lookupPatch.safeParse(input);
  if (!parsed.success) return fail("Names must be 2–60 characters.");
  const patch = { ...parsed.data };
  if (kind !== "categories") delete patch.icon;

  const supabase = await createClient();
  const { error } = await supabase.from(kind).update(patch).eq("id", id);
  if (error) return lookupError(error.message);

  updateTag(LOOKUPS_TAG);
  refresh();
  return done();
}

export async function moveLookup(
  kind: LookupKind,
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const auth = await authorize("admin");
  if (!auth.ok) return fail(auth.error);
  if (!lookupKind.safeParse(kind).success || !uuid.safeParse(id).success) return fail("Invalid item.");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from(kind)
    .select("id, sort_order")
    .order("sort_order")
    .order("name")
    .returns<{ id: string; sort_order: number }[]>();
  if (!rows) return fail("Could not reorder.");

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return done();

  // Normalise to 1..n, then swap the two neighbours.
  const ordered = rows.map((r) => r.id);
  [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
  const results = await Promise.all(
    ordered.map((rowId, i) => supabase.from(kind).update({ sort_order: i + 1 }).eq("id", rowId)),
  );
  if (results.some((r) => r.error)) return fail("Could not reorder.");

  updateTag(LOOKUPS_TAG);
  refresh();
  return done();
}

export async function deleteLookup(kind: LookupKind, id: string): Promise<ActionResult> {
  const auth = await authorize("admin");
  if (!auth.ok) return fail(auth.error);
  if (!lookupKind.safeParse(kind).success || !uuid.safeParse(id).success) return fail("Invalid item.");

  const supabase = await createClient();
  const column =
    kind === "departments" ? "department_id" : kind === "categories" ? "category_id" : "location_id";
  const { count } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq(column, id);
  if (count) return fail("This item is used by existing tickets. Disable it instead.");

  const { error } = await supabase.from(kind).delete().eq("id", id);
  if (error) return fail("Could not delete the item.");

  updateTag(LOOKUPS_TAG);
  refresh();
  return done();
}

/* -------------------------------------------------------------------------- */
/*  Team                                                                      */
/* -------------------------------------------------------------------------- */

export async function createStaff(input: unknown): Promise<ActionResult> {
  const auth = await authorize("admin");
  if (!auth.ok) return fail(auth.error);

  const parsed = staffCreateSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", z.flattenError(parsed.error).fieldErrors);
  const { fullName, email, password, role } = parsed.data;

  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
  } catch {
    return fail("SUPABASE_SECRET_KEY is not configured on the server.");
  }

  const { data, error } = await service.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    return fail(
      error?.message?.toLowerCase().includes("already")
        ? "An account with this email already exists."
        : "Could not create the account.",
    );
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    email: email.toLowerCase(),
    role,
  });
  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    return fail("Could not create the staff profile.");
  }

  refresh();
  return done();
}

const staffPatch = z.object({
  role: z.enum(["admin", "agent"]).optional(),
  is_active: z.boolean().optional(),
  full_name: z.string().trim().min(2).max(120).optional(),
});

export async function updateStaff(id: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize("admin");
  if (!auth.ok) return fail(auth.error);
  if (!uuid.safeParse(id).success) return fail("Invalid user.");

  const parsed = staffPatch.safeParse(input);
  if (!parsed.success) return fail("Invalid change.");

  if (id === auth.profile.id && (parsed.data.role === "agent" || parsed.data.is_active === false)) {
    return fail("You can't remove your own administrator access.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", id);
  if (error) return fail("Could not update the team member.");

  refresh();
  return done();
}
