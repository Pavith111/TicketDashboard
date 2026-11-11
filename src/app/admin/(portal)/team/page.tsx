import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { TeamManager } from "@/components/admin/team-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { getStaffMembers } from "@/lib/data/tickets";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="IT team"
        description="People who can sign in to this admin portal. Staff who submit requests do not need accounts."
      />
      <Suspense fallback={<Skeleton className="h-[360px] rounded-2xl" />}>
        <TeamContent />
      </Suspense>
    </>
  );
}

async function TeamContent() {
  const me = await requireAdmin();
  const staff = await getStaffMembers();
  return <TeamManager staff={staff} currentUserId={me.id} />;
}
