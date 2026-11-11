import { cn } from "@/lib/utils";

/** Monochrome Zuse Technologies wordmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[10px] bg-foreground text-background",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
        <path
          d="M6 6.5h12L6 17.5h12"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ className, label }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-[13px] font-extrabold tracking-[0.14em]">
          ZUSE TECHNOLOGIES
        </span>
        {label && (
          <span className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground">
            {label}
          </span>
        )}
      </span>
    </span>
  );
}
