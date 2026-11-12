import "server-only";
import { subDays } from "date-fns";
import { TICKET_STATUSES, type TicketPriority, type TicketStatus } from "@/lib/constants";
import { startOfTodayInTimeZone } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { TicketListItem } from "@/lib/types";

type Row = {
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  category: { name: string } | null;
  department: { name: string } | null;
};

export type DashboardData = {
  kpis: {
    active: number;
    unassigned: number;
    urgent: number;
    resolved7d: number;
    newToday: number;
    avgResolutionHours: number | null;
  };
  trend: { day: string; created: number; resolved: number }[];
  byCategory: { name: string; value: number }[];
  byDepartment: { name: string; value: number }[];
  byStatus: { status: TicketStatus; value: number }[];
  recent: TicketListItem[];
};

const WINDOW_DAYS = 30;

function rank(rows: Row[], key: "category" | "department", limit = 8) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const name = r[key]?.name ?? "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1).reduce((sum, r) => sum + r.value, 0);
  return [...head, { name: "Other", value: rest }];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const since = subDays(new Date(), WINDOW_DAYS).toISOString();
  const activeStatuses = ["open", "in_progress", "on_hold"];

  const head = () => supabase.from("tickets").select("id", { count: "exact", head: true });

  const [windowRows, trend, statusCounts, active, unassigned, urgent, recent] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        "status, priority, created_at, resolved_at, assigned_to, category:categories(name), department:departments(name)",
      )
      .gte("created_at", since)
      .returns<Row[]>(),
    supabase.rpc("ticket_daily_counts", { days: WINDOW_DAYS }),
    Promise.all(
      TICKET_STATUSES.map((status) =>
        head()
          .eq("status", status)
          .then(({ count }) => ({ status, value: count ?? 0 })),
      ),
    ),
    head().in("status", activeStatuses),
    head().in("status", activeStatuses).is("assigned_to", null),
    head().in("status", activeStatuses).in("priority", ["high", "critical"]),
    supabase
      .from("tickets")
      .select(
        `id, ticket_number, title, requester_name, requester_email, priority, status, created_at, updated_at,
         department:departments(name), category:categories(name, icon), location:locations(name),
         assignee:profiles!tickets_assigned_to_fkey(id, full_name)`,
      )
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<TicketListItem[]>(),
  ]);

  if (windowRows.error) throw new Error(windowRows.error.message);
  const rows = windowRows.data ?? [];

  // "Today" means today in Sri Lanka, not on the (UTC) server.
  const startOfToday = startOfTodayInTimeZone();

  const resolvedDurations = rows
    .filter((r) => r.resolved_at)
    .map((r) => (+new Date(r.resolved_at!) - +new Date(r.created_at)) / 36e5)
    .filter((h) => h >= 0);

  const trendRows = (trend.data ?? []) as { day: string; created: number; resolved: number }[];
  const resolved7d = trendRows
    .filter((d) => new Date(d.day) >= subDays(startOfToday, 6))
    .reduce((sum, d) => sum + Number(d.resolved), 0);

  return {
    kpis: {
      active: active.count ?? 0,
      unassigned: unassigned.count ?? 0,
      urgent: urgent.count ?? 0,
      resolved7d,
      newToday: rows.filter((r) => new Date(r.created_at) >= startOfToday).length,
      avgResolutionHours: resolvedDurations.length
        ? resolvedDurations.reduce((a, b) => a + b, 0) / resolvedDurations.length
        : null,
    },
    trend: trendRows.map((d) => ({
      day: d.day,
      created: Number(d.created),
      resolved: Number(d.resolved),
    })),
    byCategory: rank(rows, "category"),
    byDepartment: rank(rows, "department"),
    byStatus: statusCounts,
    recent: recent.data ?? [],
  };
}
