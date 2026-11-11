import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the admin portal needs session handling. The public portal stays
  // completely session-free.
  matcher: ["/admin", "/admin/:path*"],
};
