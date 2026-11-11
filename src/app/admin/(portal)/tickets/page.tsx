import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { TicketFiltersBar } from "@/components/admin/ticket-filters";
import { TicketsTable } from "@/components/admin/tickets-table";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { getManagedLookups } from "@/lib/data/lookups";
import { getStaffMembers, listTickets, parseTicketFilters } from "@/lib/data/tickets";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tickets" };

export default function TicketsPage({ searchParams }: PageProps<"/admin/tickets">) {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Tickets"
        description="Triage, assign and resolve support requests from staff."
      />
      <Suspense fallback={<TicketsSkeleton />}>
        <TicketsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TicketsContent({ searchParams }: { searchParams: PageProps<"/admin/tickets">["searchParams"] }) {
  const profile = await requireStaff();
  const params = await searchParams;
  const filters = parseTicketFilters(params);

  const [{ tickets, total, page, pageSize }, categories, departments, staff] = await Promise.all([
    listTickets(filters, profile.id),
    getManagedLookups("categories"),
    getManagedLookups("departments"),
    getStaffMembers(),
  ]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/tickets${qs ? `?${qs}` : ""}`;
  };
  const isFiltered = Boolean(
    filters.q || filters.priority || filters.category || filters.department || filters.assignee,
  );

  return (
    <div className="flex flex-col gap-4">
      <TicketFiltersBar
        filters={filters}
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
        departments={departments.map((d) => ({ value: d.id, label: d.name }))}
        staff={staff.filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.full_name }))}
      />

      <div className="surface overflow-hidden">
        {tickets.length ? (
          <TicketsTable tickets={tickets} />
        ) : (
          <EmptyState
            icon={SearchX}
            title={isFiltered ? "No tickets match these filters" : "Nothing in this queue"}
            description={
              isFiltered
                ? "Try a different search term or clear some filters."
                : "When staff submit requests, they'll show up here."
            }
            action={
              isFiltered ? (
                <Link href="/admin/tickets" className={buttonVariants({ variant: "outline" })}>
                  Clear filters
                </Link>
              ) : undefined
            }
          />
        )}

        {total > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-border bg-subtle px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <span>
              Showing{" "}
              <span className="tabular font-medium text-foreground">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </span>{" "}
              of <span className="tabular font-medium text-foreground">{total}</span>
            </span>
            <div className="flex items-center gap-1">
              <PageLink href={pageHref(page - 1)} disabled={page <= 1} label="Previous page">
                <ChevronLeft />
              </PageLink>
              <span className="tabular px-2 font-mono">
                {page} / {pages}
              </span>
              <PageLink href={pageHref(page + 1)} disabled={page >= pages} label="Next page">
                <ChevronRight />
              </PageLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "pointer-events-none opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
      {children}
    </Link>
  );
}

function TicketsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full max-w-xl rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
      <div className="surface overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
            <Skeleton className="h-4 w-28" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
