"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Building2, LayoutGrid, MapPin } from "lucide-react";
import type { LookupKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { kind: LookupKind; label: string; icon: typeof Building2 }[] = [
  { kind: "departments", label: "Departments", icon: Building2 },
  { kind: "categories", label: "Categories", icon: LayoutGrid },
  { kind: "locations", label: "Locations", icon: MapPin },
];

export function SettingsTabs({ active }: { active: LookupKind }) {
  return (
    <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
        {TABS.map((tab) => {
          const selected = tab.kind === active;
          return (
            <Link
              key={tab.kind}
              href={`/admin/settings?tab=${tab.kind}`}
              aria-current={selected ? "page" : undefined}
              scroll={false}
              className={cn(
                "relative flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                selected ? "text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selected && (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-0 rounded-lg bg-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <tab.icon className="relative size-3.5" />
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
