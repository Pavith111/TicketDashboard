import type { Metadata } from "next";
import { Suspense } from "react";
import { LookupManager } from "@/components/admin/lookup-manager";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { getManagedLookups } from "@/lib/data/lookups";
import type { LookupKind } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

const COPY: Record<LookupKind, { title: string; description: string; singular: string }> = {
  departments: {
    title: "Departments",
    singular: "department",
    description: "Shown in the Department field of the staff request form.",
  },
  categories: {
    title: "Issue categories",
    singular: "category",
    description: "The tiles staff pick from to describe their problem.",
  },
  locations: {
    title: "Locations & buildings",
    singular: "location",
    description: "Buildings and areas technicians may be sent to.",
  },
};

export default function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage the options staff see on the support request form. Changes go live immediately."
      />
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SettingsContent({ searchParams }: { searchParams: PageProps<"/admin/settings">["searchParams"] }) {
  await requireAdmin();
  const { tab } = await searchParams;
  const kind: LookupKind =
    tab === "categories" || tab === "locations" || tab === "departments" ? tab : "departments";
  const items = await getManagedLookups(kind);

  return (
    <div className="flex flex-col gap-6">
      <SettingsTabs active={kind} />
      <LookupManager key={kind} kind={kind} items={items} {...COPY[kind]} />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-96 max-w-full rounded-xl" />
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}
