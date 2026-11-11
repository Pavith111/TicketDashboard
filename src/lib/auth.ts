import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { StaffProfile } from "@/lib/types";

type Session = {
  userId: string | null;
  email: string | null;
  profile: StaffProfile | null;
};

/**
 * Data Access Layer: the single place that decides who the caller is.
 * Deduplicated per request with React `cache`.
 */
export const getSession = cache(async (): Promise<Session> => {
  if (!isSupabaseConfigured) return { userId: null, email: null, profile: null };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { userId: null, email: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .eq("id", claims.sub)
    .maybeSingle<StaffProfile>();

  return {
    userId: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    profile: profile?.is_active ? profile : null,
  };
});

/** For pages: redirect anyone who is not active IT staff. */
export async function requireStaff(): Promise<StaffProfile> {
  const { userId, profile } = await getSession();
  if (!userId) redirect("/admin/login");
  if (!profile) redirect("/admin/login?error=no-access");
  return profile;
}

/** For pages that only administrators may open. */
export async function requireAdmin(): Promise<StaffProfile> {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/admin?error=forbidden");
  return profile;
}

/** For Server Actions: never redirect, just report. */
export async function authorize(role: "staff" | "admin" = "staff") {
  const { profile } = await getSession();
  if (!profile) return { ok: false as const, error: "Your session has expired. Sign in again." };
  if (role === "admin" && profile.role !== "admin") {
    return { ok: false as const, error: "Only administrators can do that." };
  }
  return { ok: true as const, profile };
}
