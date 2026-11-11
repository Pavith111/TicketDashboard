import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { Lookup, LookupKind, PublicLookups } from "@/lib/types";

export const LOOKUPS_TAG = "lookups";

/**
 * Active departments, categories and locations for the public form.
 * Cached on the server and refreshed whenever an admin edits settings.
 */
export async function getPublicLookups(): Promise<PublicLookups> {
  "use cache";
  cacheTag(LOOKUPS_TAG);
  cacheLife("hours");

  if (!isSupabaseConfigured) return { departments: [], categories: [], locations: [] };

  const supabase = createPublicClient();
  const query = (table: LookupKind, columns: string) =>
    supabase
      .from(table)
      .select(columns)
      .eq("is_active", true)
      .order("sort_order")
      .order("name")
      .returns<Lookup[]>();

  const [departments, categories, locations] = await Promise.all([
    query("departments", "id, name, is_active, sort_order"),
    query("categories", "id, name, icon, is_active, sort_order"),
    query("locations", "id, name, is_active, sort_order"),
  ]);

  const error = departments.error ?? categories.error ?? locations.error;
  if (error) throw new Error(`Could not load form options: ${error.message}`);

  return {
    departments: departments.data ?? [],
    categories: categories.data ?? [],
    locations: locations.data ?? [],
  };
}

export type ManagedLookup = Lookup & { ticket_count: number };

/** All rows (including disabled) with usage counts — staff only, via RLS. */
export async function getManagedLookups(kind: LookupKind): Promise<ManagedLookup[]> {
  const supabase = await createClient();
  const columns =
    kind === "categories"
      ? "id, name, icon, is_active, sort_order, tickets(count)"
      : "id, name, is_active, sort_order, tickets(count)";

  const { data, error } = await supabase
    .from(kind)
    .select(columns)
    .order("sort_order")
    .order("name")
    .returns<(Lookup & { tickets: { count: number }[] })[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(({ tickets, ...row }) => ({
    ...row,
    ticket_count: tickets?.[0]?.count ?? 0,
  }));
}
