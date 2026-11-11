import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  Flame,
  Inbox,
  Sparkles,
  Timer,
  UserRoundX,
} from "lucide-react";
import { CategoryChart, StatusBreakdown, TrendChart } from "@/components/admin/charts";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/analytics";
import { formatDuration, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <Suspense fallback={null}>
        <ForbiddenNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const profile = await requireStaff();
  const data = await getDashboardData();
  const firstName = profile.full_name.split(" ")[0];
  const { kpis } = data;
  const hasData = data.trend.some((d) => d.created || d.resolved) || kpis.active > 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Hello, ${firstName}`}
        description="Here's what's happening across IT Support."
        actions={
          <Link href="/admin/tickets" className={buttonVariants()}>
            Open ticket queue
            <ArrowRight />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <StatCard label="Active tickets" value={kpis.active} icon={Inbox} href="/admin/tickets" hint={`${kpis.newToday} new today`} />
        <StatCard
          label="Unassigned"
          value={kpis.unassigned}
          icon={UserRoundX}
          href="/admin/tickets?assignee=unassigned"
          hint="Waiting for an owner"
        />
        <StatCard
          label="High & critical"
          value={kpis.urgent}
          icon={Flame}
          href="/admin/tickets?sort=priority"
          hint="Active, high priority"
          emphasis={kpis.urgent > 0}
        />
        <StatCard label="Resolved · 7 days" value={kpis.resolved7d} icon={CircleCheck} hint="Closed out this week" />
        <StatCard
          label="Avg. resolution"
          value={formatDuration(kpis.avgResolutionHours)}
          icon={Timer}
          hint="Tickets from last 30 days"
          className="col-span-2 xl:col-span-1"
        />
      </div>

      {!hasData ? (
        <div className="surface mt-6">
          <EmptyState
            icon={Sparkles}
            title="No tickets yet"
            description="Share the staff portal link with employees. New requests and analytics will appear here as they come in."
            action={
              <Link href="/" target="_blank" className={buttonVariants({ variant: "outline" })}>
                Open staff portal <ArrowUpRight />
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Panel title="Ticket volume" description="Created vs. resolved, last 30 days">
              <TrendChart data={data.trend} />
            </Panel>
            <Panel title="By status" description="All tickets">
              <StatusBreakdown data={data.byStatus} />
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="Top categories" description="Tickets created, last 30 days">
              <CategoryChart data={data.byCategory} />
            </Panel>
            <Panel title="By department" description="Tickets created, last 30 days">
              <CategoryChart data={data.byDepartment} />
            </Panel>
          </div>

          <div className="surface mt-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold">Latest requests</h2>
                <p className="text-xs text-muted-foreground">Most recent submissions from staff</p>
              </div>
              <Link href="/admin/tickets?status=all" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                View all <ArrowRight />
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {data.recent.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/admin/tickets/${t.id}`}
                    className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="w-32 shrink-0 font-mono text-xs text-muted-foreground">{t.ticket_number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.requester_name} · {t.department?.name ?? "—"}
                      </span>
                    </span>
                    <span className="flex items-center gap-4">
                      <PriorityBadge priority={t.priority} className="w-20" />
                      <StatusBadge status={t.status} />
                      <span className="w-24 text-right text-xs text-muted-foreground">{timeAgo(t.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface flex flex-col p-5">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[340px] rounded-2xl" />
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
    </>
  );
}
