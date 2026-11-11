"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, UserRoundCheck } from "lucide-react";
import { updateTicket } from "@/app/admin/actions";
import { PriorityBars } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PRIORITY_META,
  STATUS_META,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type State = { status: TicketStatus; priority: TicketPriority; assignedTo: string | null };
const UNASSIGNED = "__none";

export function TicketControls({
  ticketId,
  status,
  priority,
  assignedTo,
  currentUserId,
  staff,
}: State & {
  ticketId: string;
  currentUserId: string;
  staff: { value: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic<State, Partial<State>>(
    { status, priority, assignedTo },
    (current, patch) => ({ ...current, ...patch }),
  );

  const save = (patch: Partial<State>, message: string) => {
    startTransition(async () => {
      setOptimistic(patch);
      const result = await updateTicket({ ticketId, ...patch });
      if (result.ok) toast.success(message);
      else toast.error(result.error);
    });
  };

  const assigneeItems = [{ value: UNASSIGNED, label: "Unassigned" }, ...staff];

  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Properties</h2>
        {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex flex-col gap-4">
        <Row label="Status">
          <Select
            items={TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
            value={state.status}
            onValueChange={(v) => v && v !== state.status && save({ status: v as TicketStatus }, `Status set to ${STATUS_META[v as TicketStatus].label}`)}
          >
            <SelectTrigger className="w-full" aria-label="Status">
              <span className={cn("size-2 rounded-full", STATUS_META[state.status].dot)} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {TICKET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Priority">
          <Select
            items={TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))}
            value={state.priority}
            onValueChange={(v) => v && v !== state.priority && save({ priority: v as TicketPriority }, `Priority set to ${PRIORITY_META[v as TicketPriority].label}`)}
          >
            <SelectTrigger className="w-full" aria-label="Priority">
              <PriorityBars priority={state.priority} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {TICKET_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  <PriorityBars priority={p} />
                  {PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Assignee">
          <Select
            items={assigneeItems}
            value={state.assignedTo ?? UNASSIGNED}
            onValueChange={(v) => {
              const next = !v || v === UNASSIGNED ? null : String(v);
              if (next === state.assignedTo) return;
              save({ assignedTo: next }, next ? `Assigned to ${staff.find((s) => s.value === next)?.label}` : "Ticket unassigned");
            }}
          >
            <SelectTrigger className="w-full" aria-label="Assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {assigneeItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.assignedTo !== currentUserId && (
            <Button
              variant="link"
              size="sm"
              className="mt-1 h-auto self-start px-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => save({ assignedTo: currentUserId }, "Assigned to you")}
            >
              <UserRoundCheck /> Assign to me
            </Button>
          )}
        </Row>

        {(state.status === "open" || state.status === "in_progress" || state.status === "on_hold") && (
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            {state.status !== "in_progress" ? (
              <Button variant="outline" onClick={() => save({ status: "in_progress", ...(state.assignedTo ? {} : { assignedTo: currentUserId }) }, "Work started")}>
                Start work
              </Button>
            ) : (
              <Button variant="outline" onClick={() => save({ status: "on_hold" }, "Put on hold")}>
                Put on hold
              </Button>
            )}
            <Button onClick={() => save({ status: "resolved" }, "Ticket resolved")}>Resolve</Button>
          </div>
        )}
        {state.status === "resolved" && (
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => save({ status: "open" }, "Ticket reopened")}>
              Reopen
            </Button>
            <Button onClick={() => save({ status: "closed" }, "Ticket closed")}>Close ticket</Button>
          </div>
        )}
        {state.status === "closed" && (
          <div className="border-t border-border pt-4">
            <Button variant="outline" className="w-full" onClick={() => save({ status: "open" }, "Ticket reopened")}>
              Reopen ticket
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
