"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_META, STATUS_META, TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/constants";
import type { TicketFilters } from "@/lib/data/tickets";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

const STATUS_TABS: Option[] = [
  { value: "active", label: "Active" },
  ...TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
  { value: "all", label: "All" },
];

const SORTS: Option[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "priority", label: "Highest priority" },
  { value: "updated", label: "Recently updated" },
];

const ANY = "__any";

export function TicketFiltersBar({
  filters,
  categories,
  departments,
  staff,
}: {
  filters: TicketFilters;
  categories: Option[];
  departments: Option[];
  staff: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");
  const lastPushed = useRef(filters.q ?? "");

  const push = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: filters.q,
      status: filters.status === "active" ? undefined : filters.status,
      priority: filters.priority,
      category: filters.category,
      department: filters.department,
      assignee: filters.assignee,
      sort: filters.sort === "newest" ? undefined : filters.sort,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v && v !== ANY) sp.set(k, v);
    const qs = sp.toString();
    startTransition(() => router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  };

  // Debounced search.
  useEffect(() => {
    if (q === lastPushed.current) return;
    const t = setTimeout(() => {
      lastPushed.current = q;
      push({ q: q.trim() || undefined });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeStatus = filters.status ?? "active";
  const hasFilters = Boolean(
    filters.q || filters.priority || filters.category || filters.department || filters.assignee,
  );

  const assigneeOptions: Option[] = [
    { value: ANY, label: "Anyone" },
    { value: "me", label: "Assigned to me" },
    { value: "unassigned", label: "Unassigned" },
    ...staff,
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Status tabs */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Status" className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
          {STATUS_TABS.map((tab) => {
            const selected = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={selected}
                onClick={() => push({ status: tab.value === "active" ? undefined : tab.value, page: undefined })}
                className={cn(
                  "relative h-8 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                  selected ? "text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="status-tab"
                    className="absolute inset-0 rounded-lg bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by ticket number, subject, name or email"
            className="pr-10 pl-10"
            aria-label="Search tickets"
          />
          {pending && (
            <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
          <FilterSelect
            label="Priority"
            value={filters.priority}
            options={[{ value: ANY, label: "Any priority" }, ...TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))]}
            onChange={(v) => push({ priority: v, page: undefined })}
          />
          <FilterSelect
            label="Category"
            value={filters.category}
            options={[{ value: ANY, label: "Any category" }, ...categories]}
            onChange={(v) => push({ category: v, page: undefined })}
          />
          <FilterSelect
            label="Department"
            value={filters.department}
            options={[{ value: ANY, label: "Any department" }, ...departments]}
            onChange={(v) => push({ department: v, page: undefined })}
          />
          <FilterSelect
            label="Assignee"
            value={filters.assignee}
            options={assigneeOptions}
            onChange={(v) => push({ assignee: v, page: undefined })}
          />
          <FilterSelect
            label="Sort"
            value={filters.sort}
            options={SORTS}
            onChange={(v) => push({ sort: v === "newest" ? undefined : v })}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              className="h-10"
              onClick={() => {
                setQ("");
                lastPushed.current = "";
                startTransition(() => router.push(pathname));
              }}
            >
              <X /> Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: Option[];
  onChange: (value: string | undefined) => void;
}) {
  const current = value ?? options[0]?.value ?? ANY;
  return (
    <Select
      items={options}
      value={current}
      onValueChange={(v) => onChange(!v || v === ANY ? undefined : String(v))}
    >
      <SelectTrigger aria-label={label} className="w-full min-w-0 lg:w-auto lg:min-w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-48">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
