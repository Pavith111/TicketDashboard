"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Check,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { createLookup, deleteLookup, moveLookup, updateLookup } from "@/app/admin/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CategoryGlyph } from "@/components/shared/category-glyph";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import type { ManagedLookup } from "@/lib/data/lookups";
import type { LookupKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LookupManager({
  kind,
  items,
  title,
  description,
  singular,
}: {
  kind: LookupKind;
  items: ManagedLookup[];
  title: string;
  description: string;
  singular: string;
}) {
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; item: ManagedLookup } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const activeCount = items.filter((i) => i.is_active).length;

  const run = (id: string, action: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
    setBusyId(id);
    startTransition(async () => {
      const result = await action();
      setBusyId(null);
      if (result.ok) {
        if (success) toast.success(success);
      } else toast.error(result.error ?? "Something went wrong");
    });
  };

  return (
    <section className="surface overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className="text-[13px] text-muted-foreground">
            {description}{" "}
            <span className="tabular whitespace-nowrap">
              {activeCount} of {items.length} enabled.
            </span>
          </p>
        </div>
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus />
          Add {singular}
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={`No ${title.toLowerCase()} yet`}
          description={`Add your first ${singular} so staff can select it.`}
        />
      ) : (
        <ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const busy = busyId === item.id;
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn("flex items-center gap-3 px-5 py-3 sm:px-6", !item.is_active && "bg-subtle")}
                >
                  <div className="hidden flex-col sm:flex">
                    <button
                      type="button"
                      aria-label={`Move ${item.name} up`}
                      disabled={index === 0 || busy}
                      onClick={() => run(item.id, () => moveLookup(kind, item.id, "up"))}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.name} down`}
                      disabled={index === items.length - 1 || busy}
                      onClick={() => run(item.id, () => moveLookup(kind, item.id, "down"))}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                  </div>

                  {kind === "categories" && (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      <CategoryGlyph name={item.icon} className="size-4 text-muted-foreground" strokeWidth={1.85} />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", !item.is_active && "text-muted-foreground")}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="tabular">{item.ticket_count}</span> ticket{item.ticket_count === 1 ? "" : "s"}
                      {!item.is_active && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <EyeOff className="size-3" /> Hidden from form
                        </span>
                      )}
                    </p>
                  </div>

                  {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

                  <Switch
                    checked={item.is_active}
                    disabled={busy}
                    aria-label={item.is_active ? `Disable ${item.name}` : `Enable ${item.name}`}
                    onCheckedChange={(checked) =>
                      run(
                        item.id,
                        () => updateLookup(kind, item.id, { is_active: checked }),
                        checked ? `${item.name} enabled` : `${item.name} disabled`,
                      )
                    }
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${item.name}`} />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setDialog({ mode: "edit", item })}>
                        <Pencil /> Rename{kind === "categories" ? " / icon" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          run(item.id, () => updateLookup(kind, item.id, { is_active: !item.is_active }))
                        }
                      >
                        <Power /> {item.is_active ? "Disable" : "Enable"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={item.ticket_count > 0}
                        onClick={() => run(item.id, () => deleteLookup(kind, item.id), `${item.name} deleted`)}
                      >
                        <Trash2 /> {item.ticket_count > 0 ? "In use, can't delete" : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <LookupDialog
        kind={kind}
        singular={singular}
        state={dialog}
        onClose={() => setDialog(null)}
      />
    </section>
  );
}

function LookupDialog({
  kind,
  singular,
  state,
  onClose,
}: {
  kind: LookupKind;
  singular: string;
  state: { mode: "create" } | { mode: "edit"; item: ManagedLookup } | null;
  onClose: () => void;
}) {
  const editing = state?.mode === "edit" ? state.item : null;
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {state && (
          <LookupDialogBody
            key={editing?.id ?? "new"}
            kind={kind}
            singular={singular}
            editing={editing}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LookupDialogBody({
  kind,
  singular,
  editing,
  onClose,
}: {
  kind: LookupKind;
  singular: string;
  editing: ManagedLookup | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "circle-help");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { name, ...(kind === "categories" ? { icon } : {}) };
      const result = editing
        ? await updateLookup(kind, editing.id, payload)
        : await createLookup(kind, payload);
      if (result.ok) {
        toast.success(editing ? "Changes saved" : `${name.trim()} added`);
        onClose();
      } else setError(result.fieldErrors?.name?.[0] ?? result.error);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">
          {editing ? `Edit ${singular}` : `Add ${singular}`}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? "Renaming updates existing tickets too, since they reference this item."
            : "It appears on the staff request form straight away."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <label htmlFor="lookup-name" className="text-[13px] font-medium">
          Name
        </label>
        <Input
          id="lookup-name"
          value={name}
          autoFocus
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </div>

      {kind === "categories" && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">Icon</span>
          <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 gap-1.5">
            {Object.entries(CATEGORY_ICONS).map(([key, { icon: Icon, label }]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={icon === key}
                aria-label={label}
                title={label}
                onClick={() => setIcon(key)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                  icon === key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={1.85} />
              </button>
            ))}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          <X /> Cancel
        </Button>
        <Button type="submit" disabled={pending || name.trim().length < 2}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
          {editing ? "Save changes" : `Add ${singular}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
