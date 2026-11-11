import Link from "next/link";
import { PriorityBadge, StatusBadge } from "@/components/shared/badges";
import { CategoryGlyph } from "@/components/shared/category-glyph";
import { formatDate, timeAgo } from "@/lib/format";
import type { TicketListItem } from "@/lib/types";
import { Avatar } from "./user-menu";

export function TicketsTable({ tickets }: { tickets: TicketListItem[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-subtle text-left text-xs text-muted-foreground">
              <th className="h-10 px-5 font-medium">Ticket</th>
              <th className="h-10 px-3 font-medium">Subject</th>
              <th className="hidden h-10 px-3 font-medium xl:table-cell">Category</th>
              <th className="h-10 px-3 font-medium">Priority</th>
              <th className="h-10 px-3 font-medium">Status</th>
              <th className="hidden h-10 px-3 font-medium lg:table-cell">Assignee</th>
              <th className="h-10 px-5 text-right font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map((t) => {
              const href = `/admin/tickets/${t.id}`;
              return (
                <tr key={t.id} className="group relative transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3.5 align-top whitespace-nowrap">
                    <Link href={href} className="font-mono text-xs text-muted-foreground after:absolute after:inset-0 group-hover:text-foreground">
                      {t.ticket_number}
                    </Link>
                  </td>
                  <td className="max-w-0 px-3 py-3 lg:w-[38%]">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.requester_name} · {t.department?.name ?? "—"} · {t.location?.name ?? "—"}
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 xl:table-cell">
                    <span className="flex items-center gap-2 text-[13px] whitespace-nowrap text-muted-foreground">
                      <CategoryGlyph name={t.category?.icon} className="size-3.5" strokeWidth={1.85} />
                      {t.category?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    {t.assignee ? (
                      <span className="flex items-center gap-2 text-[13px] whitespace-nowrap">
                        <Avatar name={t.assignee.full_name} className="size-6 text-[9px]" />
                        {t.assignee.full_name}
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="text-[13px]">{formatDate(t.created_at, "d MMM")}</div>
                    <div className="text-xs text-muted-foreground">{timeAgo(t.created_at)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link href={`/admin/tickets/${t.id}`} className="flex flex-col gap-2.5 px-4 py-4 active:bg-muted/50">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">{t.ticket_number}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(t.created_at)}</span>
              </div>
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.requester_name} · {t.department?.name ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {t.assignee?.full_name ?? "Unassigned"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
