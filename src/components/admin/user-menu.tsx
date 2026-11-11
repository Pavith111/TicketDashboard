"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDown, ExternalLink, LogOut } from "lucide-react";
import { signOut } from "@/app/admin/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_META } from "@/lib/constants";
import { initials } from "@/lib/format";
import type { StaffProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-heading text-[11px] font-bold text-background",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function UserMenu({ profile, compact }: { profile: StaffProfile; compact?: boolean }) {
  const [, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-xl text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
          compact ? "p-0.5" : "w-full p-2",
        )}
        aria-label="Account menu"
      >
        <Avatar name={profile.full_name} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{profile.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{ROLE_META[profile.role].label}</span>
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={compact ? "bottom" : "top"} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-foreground">{profile.full_name}</span>
            <span className="truncate text-xs font-normal">{profile.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/" target="_blank" />}>
          <ExternalLink />
          Open staff portal
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => start(() => signOut())}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
