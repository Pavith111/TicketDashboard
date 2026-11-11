"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Inbox,
  LayoutDashboard,
  Menu,
  Settings2,
  Ticket,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Counts = { active: number; unassigned: number; mine: number };

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: keyof Counts;
  match: (path: string, search: string) => boolean;
};

const WORKSPACE: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/admin" },
  {
    href: "/admin/tickets",
    label: "All tickets",
    icon: Ticket,
    count: "active",
    match: (p) => p.startsWith("/admin/tickets"),
  },
];

const QUEUES: Item[] = [
  {
    href: "/admin/tickets?assignee=me",
    label: "Assigned to me",
    icon: UserRound,
    count: "mine",
    match: () => false,
  },
  {
    href: "/admin/tickets?assignee=unassigned",
    label: "Unassigned",
    icon: Inbox,
    count: "unassigned",
    match: () => false,
  },
];

const ADMIN: Item[] = [
  { href: "/admin/settings", label: "Settings", icon: Settings2, match: (p) => p.startsWith("/admin/settings") },
  { href: "/admin/team", label: "Team", icon: UsersRound, match: (p) => p.startsWith("/admin/team") },
];

function NavGroup({
  title,
  items,
  counts,
  pathname,
  onNavigate,
  layoutId,
}: {
  title: string;
  items: Item[];
  counts: Counts;
  pathname: string;
  onNavigate?: () => void;
  layoutId: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pt-4 pb-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase first:pt-0">
        {title}
      </p>
      {items.map((item) => {
        const active = item.match(pathname, "");
        const count = item.count ? counts[item.count] : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] dark:bg-sidebar-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <item.icon className="relative size-4" strokeWidth={1.85} />
            <span className="relative flex-1">{item.label}</span>
            {count !== undefined && count > 0 && (
              <span className="tabular relative rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function NavContent({
  role,
  counts,
  onNavigate,
  layoutId,
}: {
  role: StaffRole;
  counts: Counts;
  onNavigate?: () => void;
  layoutId: string;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-2" aria-label="Admin">
      <NavGroup title="Workspace" items={WORKSPACE} counts={counts} pathname={pathname} onNavigate={onNavigate} layoutId={layoutId} />
      <NavGroup title="Queues" items={QUEUES} counts={counts} pathname={pathname} onNavigate={onNavigate} layoutId={layoutId} />
      {role === "admin" && (
        <NavGroup title="Administration" items={ADMIN} counts={counts} pathname={pathname} onNavigate={onNavigate} layoutId={layoutId} />
      )}
    </nav>
  );
}

export function SidebarNav({ role, counts }: { role: StaffRole; counts: Counts }) {
  return <NavContent role={role} counts={counts} layoutId="sidebar-active" />;
}

export function MobileNav({ role, counts }: { role: StaffRole; counts: Counts }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-16 items-center px-5">
          <Logo label="IT Support · Admin" />
        </div>
        <div className="px-3 py-4">
          <NavContent role={role} counts={counts} onNavigate={() => setOpen(false)} layoutId="mobile-active" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SidebarNavSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-1">
      <Skeleton className="mb-2 h-3 w-20" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-9 rounded-lg" />
      ))}
    </div>
  );
}
