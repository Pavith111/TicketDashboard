import { PRIORITY_META, STATUS_META, type TicketPriority, type TicketStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function PriorityBars({ priority, className }: { priority: TicketPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex items-end gap-[2px]", meta.tone, className)} aria-hidden>
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-[3px] rounded-[1px]",
            bar <= meta.bars ? "bg-current" : "bg-current opacity-20",
          )}
          style={{ height: 4 + bar * 2.5 }}
        />
      ))}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-2 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <PriorityBars priority={priority} />
      {PRIORITY_META[priority].label}
    </span>
  );
}
