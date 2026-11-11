import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  ImageIcon,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  UserRound,
} from "lucide-react";
import { DeleteTicketButton } from "@/components/admin/delete-ticket-button";
import { TicketControls } from "@/components/admin/ticket-controls";
import { TicketTimeline } from "@/components/admin/ticket-timeline";
import { StatusBadge } from "@/components/shared/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { CategoryGlyph } from "@/components/shared/category-glyph";
import { getStaffMembers, getTicket } from "@/lib/data/tickets";
import { formatBytes, formatDateTime, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Ticket" };

export default function TicketPage({ params }: PageProps<"/admin/tickets/[id]">) {
  return (
    <>
      <Link
        href="/admin/tickets"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tickets
      </Link>
      <Suspense fallback={<TicketSkeleton />}>
        <TicketContent params={params} />
      </Suspense>
    </>
  );
}

async function TicketContent({ params }: { params: PageProps<"/admin/tickets/[id]">["params"] }) {
  const profile = await requireStaff();
  const { id } = await params;
  const [result, staff] = await Promise.all([getTicket(id), getStaffMembers()]);
  if (!result) notFound();

  const { ticket, attachments, notes, activity } = result;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* Header */}
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {ticket.ticket_number}
            </span>
            <StatusBadge status={ticket.status} />
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CategoryGlyph name={ticket.category?.icon} className="size-3.5" />
              {ticket.category?.name}
            </span>
          </div>
          <h1 className="mt-4 text-2xl leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[1.75rem]">
            {ticket.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Opened by <span className="font-medium text-foreground">{ticket.requester_name}</span>{" "}
            {timeAgo(ticket.created_at)} · {formatDateTime(ticket.created_at)}
          </p>
        </header>

        {/* Description */}
        <section className="surface p-5 sm:p-6">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Description</h2>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{ticket.description}</p>

          {attachments.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Paperclip className="size-3.5" /> Attachments · {attachments.length}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {attachments.map((file) => {
                  const Icon = file.mime_type.startsWith("image/")
                    ? ImageIcon
                    : file.mime_type === "application/pdf"
                      ? FileText
                      : Paperclip;
                  return (
                    <li key={file.id}>
                      <a
                        href={file.url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!file.url}
                        className="group flex items-center gap-3 rounded-xl border border-border bg-subtle px-3 py-2.5 transition-colors hover:border-zinc-300 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:hover:border-zinc-700"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                          <Icon className="size-4 text-muted-foreground" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{file.file_name}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {file.url ? formatBytes(file.size_bytes) : "Upload incomplete"}
                          </span>
                        </span>
                        {file.url && <Download className="size-4 text-muted-foreground group-hover:text-foreground" />}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <TicketTimeline ticketId={ticket.id} notes={notes} activity={activity} currentUserId={profile.id} isAdmin={profile.role === "admin"} />
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
        <TicketControls
          ticketId={ticket.id}
          status={ticket.status}
          priority={ticket.priority}
          assignedTo={ticket.assigned_to}
          currentUserId={profile.id}
          staff={staff.filter((s) => s.is_active || s.id === ticket.assigned_to).map((s) => ({ value: s.id, label: s.full_name }))}
        />

        <section className="surface p-5">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Requester</h2>
          <dl className="flex flex-col gap-3.5 text-sm">
            <Detail icon={UserRound} label="Name">{ticket.requester_name}</Detail>
            <Detail icon={Mail} label="Email">
              <a href={`mailto:${ticket.requester_email}?subject=${encodeURIComponent(`[${ticket.ticket_number}] ${ticket.title}`)}`} className="break-all underline-offset-4 hover:underline">
                {ticket.requester_email}
              </a>
            </Detail>
            {ticket.requester_phone && (
              <Detail icon={Phone} label="Phone">
                <a href={`tel:${ticket.requester_phone.replace(/\s+/g, "")}`} className="underline-offset-4 hover:underline">
                  {ticket.requester_phone}
                </a>
              </Detail>
            )}
            <Detail icon={Building2} label="Department">{ticket.department?.name ?? "—"}</Detail>
            <Detail icon={MapPin} label="Location">
              {ticket.location?.name ?? "—"}
              {ticket.room && <span className="text-muted-foreground"> · {ticket.room}</span>}
            </Detail>
          </dl>
        </section>

        <section className="surface p-5">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Timeline</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
            <Milestone label="Created" value={ticket.created_at} />
            <Milestone label="First response" value={ticket.first_response_at} />
            <Milestone label="Resolved" value={ticket.resolved_at} />
            <Milestone label="Closed" value={ticket.closed_at} />
            <Milestone label="Last updated" value={ticket.updated_at} />
          </dl>
        </section>

        {profile.role === "admin" && <DeleteTicketButton ticketId={ticket.id} ticketNumber={ticket.ticket_number} />}
      </aside>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  );
}

function Milestone({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value ? formatDateTime(value) : <span className="text-muted-foreground">—</span>}</dd>
    </>
  );
}

function TicketSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-4 h-8 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
