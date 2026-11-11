import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-3 rounded-full border border-dashed border-border" />
        <div className="relative flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
      </div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-pretty text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
