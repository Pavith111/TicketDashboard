"use client";

import { useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Loader2, MoreHorizontal, ShieldCheck, UserPlus, UserRoundCog, UserRoundX, Wrench } from "lucide-react";
import { createStaff, updateStaff } from "@/app/admin/actions";
import { Field } from "@/components/shared/field";
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
import { ROLE_META, STAFF_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { StaffProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { staffCreateSchema, type StaffCreateInput } from "@/lib/validations";
import { Avatar } from "./user-menu";

export function TeamManager({ staff, currentUserId }: { staff: StaffProfile[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const change = (member: StaffProfile, patch: Partial<Pick<StaffProfile, "role" | "is_active">>, message: string) => {
    setBusy(member.id);
    start(async () => {
      const result = await updateStaff(member.id, patch);
      setBusy(null);
      if (result.ok) toast.success(message);
      else toast.error(result.error);
    });
  };

  return (
    <section className="surface overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-[15px] font-semibold">Members</h2>
          <p className="text-[13px] text-muted-foreground">
            <span className="tabular">{staff.filter((s) => s.is_active).length}</span> active ·{" "}
            <span className="tabular">{staff.filter((s) => s.role === "admin" && s.is_active).length}</span> administrators
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus /> Add member
        </Button>
      </header>

      <ul className="divide-y divide-border">
        {staff.map((member) => {
          const isMe = member.id === currentUserId;
          return (
            <li key={member.id} className={cn("flex items-center gap-4 px-5 py-4 sm:px-6", !member.is_active && "bg-subtle")}>
              <Avatar name={member.full_name} className={cn("size-10 text-xs", !member.is_active && "opacity-40")} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {member.full_name}
                  {isMe && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>}
                  {!member.is_active && (
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Deactivated
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              <span className="hidden items-center gap-1.5 text-[13px] text-muted-foreground sm:flex">
                {member.role === "admin" ? <ShieldCheck className="size-3.5" /> : <Wrench className="size-3.5" />}
                {ROLE_META[member.role].label}
              </span>
              <span className="hidden w-28 text-right text-xs text-muted-foreground md:block">
                Since {formatDate(member.created_at, "MMM yyyy")}
              </span>
              {busy === member.id ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={isMe}
                    render={<Button variant="ghost" size="icon-sm" aria-label={`Manage ${member.full_name}`} />}
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onClick={() =>
                        change(
                          member,
                          { role: member.role === "admin" ? "agent" : "admin" },
                          `${member.full_name} is now ${member.role === "admin" ? "a support agent" : "an administrator"}`,
                        )
                      }
                    >
                      <UserRoundCog />
                      {member.role === "admin" ? "Make support agent" : "Make administrator"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant={member.is_active ? "destructive" : "default"}
                      onClick={() =>
                        change(
                          member,
                          { is_active: !member.is_active },
                          member.is_active ? `${member.full_name} deactivated` : `${member.full_name} reactivated`,
                        )
                      }
                    >
                      {member.is_active ? <UserRoundX /> : <Check />}
                      {member.is_active ? "Deactivate access" : "Reactivate access"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">{open && <AddMemberForm onDone={() => setOpen(false)} />}</DialogContent>
      </Dialog>
    </section>
  );
}

function AddMemberForm({ onDone }: { onDone: () => void }) {
  const id = useId();
  const [pending, start] = useTransition();
  const { register, handleSubmit, control, formState, setError } = useForm<StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: { fullName: "", email: "", password: "", role: "agent" },
  });
  const e = formState.errors;

  const submit = handleSubmit((values) =>
    start(async () => {
      const result = await createStaff(values);
      if (result.ok) {
        toast.success(`${values.fullName} can now sign in`, {
          description: "Share the temporary password securely and ask them to keep it private.",
        });
        onDone();
      } else {
        for (const [field, msgs] of Object.entries(result.fieldErrors ?? {})) {
          if (msgs?.[0]) setError(field as keyof StaffCreateInput, { message: msgs[0] });
        }
        toast.error(result.error);
      }
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">Add IT team member</DialogTitle>
        <DialogDescription>They&apos;ll sign in at /admin/login with this email and password.</DialogDescription>
      </DialogHeader>

      <Field id={`${id}-name`} label="Full name" error={e.fullName?.message}>
        <Input id={`${id}-name`} autoFocus aria-invalid={e.fullName ? true : undefined} {...register("fullName")} />
      </Field>
      <Field id={`${id}-email`} label="Email" error={e.email?.message}>
        <Input id={`${id}-email`} type="email" aria-invalid={e.email ? true : undefined} {...register("email")} />
      </Field>
      <Field id={`${id}-password`} label="Temporary password" hint="At least 10 characters." error={e.password?.message}>
        <Input id={`${id}-password`} type="text" autoComplete="new-password" className="font-mono" aria-invalid={e.password ? true : undefined} {...register("password")} />
      </Field>
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-2">
            {STAFF_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={field.value === role}
                onClick={() => field.onChange(role)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors",
                  field.value === role ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-zinc-300 dark:hover:border-zinc-600",
                )}
              >
                <span className="text-[13px] font-semibold">{ROLE_META[role].label}</span>
                <span className="text-xs text-muted-foreground">{ROLE_META[role].description}</span>
              </button>
            ))}
          </div>
        )}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Add member
        </Button>
      </DialogFooter>
    </form>
  );
}
