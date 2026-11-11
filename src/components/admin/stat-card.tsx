import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  emphasis,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  emphasis?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg border border-border",
            emphasis ? "border-transparent bg-foreground text-background" : "bg-subtle text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
      </div>
      <div className="tabular mt-3 font-heading text-[2rem] leading-none font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-2 truncate text-xs text-muted-foreground">{hint}</div>}
    </>
  );

  const classes = cn("surface block p-4 sm:p-5", className);
  return href ? (
    <Link href={href} className={cn(classes, "transition-all hover:-translate-y-px hover:border-zinc-300 dark:hover:border-zinc-700")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
