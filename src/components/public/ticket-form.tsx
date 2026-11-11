"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  UploadCloud,
  X,
} from "lucide-react";
import { submitTicket } from "@/app/actions/submit-ticket";
import { Field } from "@/components/shared/field";
import { PriorityBars } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryGlyph } from "@/components/shared/category-glyph";
import { ATTACHMENT_RULES, PRIORITY_META, TICKET_PRIORITIES } from "@/lib/constants";
import { ATTACHMENT_BUCKET } from "@/lib/env";
import { formatBytes } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";
import type { PublicLookups } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ticketSubmissionSchema, type TicketSubmission } from "@/lib/validations";
import { SuccessState } from "./success-state";

const DEFAULTS: Partial<TicketSubmission> = {
  fullName: "",
  email: "",
  phone: "",
  departmentId: "",
  locationId: "",
  room: "",
  categoryId: "",
  title: "",
  description: "",
  priority: "medium",
  website: "",
};

export function TicketForm({ lookups }: { lookups: PublicLookups }) {
  const formId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState<{ ticketNumber: string; email: string; failedUploads: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stage, setStage] = useState<"idle" | "sending" | "uploading">("idle");
  const topRef = useRef<HTMLDivElement>(null);

  const form = useForm<TicketSubmission>({
    resolver: zodResolver(ticketSubmissionSchema),
    defaultValues: DEFAULTS,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const errors = formState.errors;
  const description = useWatch({ control, name: "description" }) ?? "";
  const id = (name: string) => `${formId}-${name}`;
  const aria = (name: keyof TicketSubmission) =>
    ({
      id: id(name),
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? `${id(name)}-error` : undefined,
    }) as const;

  const onValid = (values: TicketSubmission) => {
    startTransition(async () => {
      setStage("sending");
      const result = await submitTicket(
        values,
        files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      );

      if (!result.ok) {
        setStage("idle");
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as keyof TicketSubmission, { message: messages[0] });
        }
        toast.error("Couldn't submit your request", { description: result.error });
        return;
      }

      let failedUploads = files.length - result.data.uploads.length;
      if (result.data.uploads.length) {
        setStage("uploading");
        const supabase = createClient();
        const outcomes = await Promise.all(
          result.data.uploads.map(({ path, token, index }) =>
            supabase.storage
              .from(ATTACHMENT_BUCKET)
              .uploadToSignedUrl(path, token, files[index], { contentType: files[index].type }),
          ),
        );
        failedUploads += outcomes.filter((o) => o.error).length;
      }

      setStage("idle");
      setSubmitted({ ticketNumber: result.data.ticketNumber, email: values.email, failedUploads });
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const startOver = () => {
    reset(DEFAULTS);
    setFiles([]);
    setSubmitted(null);
  };

  return (
    <div ref={topRef} className="scroll-mt-24">
      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <SuccessState key="success" {...submitted} onReset={startOver} />
        ) : (
          <motion.form
            key="form"
            onSubmit={(event) => void handleSubmit(onValid)(event)}
            noValidate
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="surface-elevated overflow-hidden"
          >
            {/* Honeypot: visually hidden, skipped by keyboard and screen readers. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
              </label>
            </div>

            <Section step="01" title="Your details" description="So we know who to contact about this request.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id={id("fullName")} label="Full name" error={errors.fullName?.message}>
                  <Input placeholder="e.g. Nimali Perera" autoComplete="name" {...aria("fullName")} {...register("fullName")} />
                </Field>
                <Field id={id("email")} label="Staff email" error={errors.email?.message}>
                  <Input
                    type="email"
                    inputMode="email"
                    placeholder="School email address"
                    autoComplete="email"
                    {...aria("email")}
                    {...register("email")}
                  />
                </Field>
                <Field id={id("phone")} label="Contact number" optional error={errors.phone?.message}>
                  <Input type="tel" inputMode="tel" placeholder="07X XXX XXXX" autoComplete="tel" {...aria("phone")} {...register("phone")} />
                </Field>
                <Field id={id("departmentId")} label="Department" error={errors.departmentId?.message}>
                  <LookupSelect
                    control={control}
                    name="departmentId"
                    items={lookups.departments}
                    placeholder="Select department"
                    triggerProps={aria("departmentId")}
                  />
                </Field>
              </div>
            </Section>

            <Section step="02" title="Location" description="Where should our technician go?">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id={id("locationId")} label="Location / Building" error={errors.locationId?.message}>
                  <LookupSelect
                    control={control}
                    name="locationId"
                    items={lookups.locations}
                    placeholder="Select a building"
                    triggerProps={aria("locationId")}
                  />
                </Field>
                <Field id={id("room")} label="Room / Lab" optional error={errors.room?.message}>
                  <Input placeholder="e.g. Lab 2, Room 14B" {...aria("room")} {...register("room")} />
                </Field>
              </div>
            </Section>

            <Section step="03" title="The issue" description="The more detail you give, the faster we can fix it.">
              <div className="flex flex-col gap-6">
                <Field id={id("categoryId")} label="Issue category" error={errors.categoryId?.message}>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <div
                        role="radiogroup"
                        id={id("categoryId")}
                        aria-invalid={errors.categoryId ? true : undefined}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
                      >
                        {lookups.categories.map((cat) => {
                          const selected = field.value === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => field.onChange(cat.id)}
                              onBlur={field.onBlur}
                              className={cn(
                                "group relative flex min-h-[72px] flex-col items-start justify-between gap-2 rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-ring/20",
                                selected
                                  ? "border-foreground bg-foreground text-background shadow-[var(--shadow-elevated)]"
                                  : "border-border bg-card hover:border-zinc-300 hover:bg-muted/40 dark:hover:border-zinc-600",
                              )}
                            >
                              <CategoryGlyph
                                name={cat.icon}
                                strokeWidth={1.75}
                                className={cn(
                                  "size-[18px] transition-colors",
                                  selected ? "text-background" : "text-muted-foreground group-hover:text-foreground",
                                )}
                              />
                              <span className="text-[13px] leading-tight font-medium">{cat.name}</span>
                            </button>
                          );
                        })}
                        {!lookups.categories.length && <OptionsUnavailable />}
                      </div>
                    )}
                  />
                </Field>

                <Field id={id("title")} label="Issue title" error={errors.title?.message}>
                  <Input placeholder="e.g. Projector in Room 12 shows no signal" maxLength={150} {...aria("title")} {...register("title")} />
                </Field>

                <Field
                  id={id("description")}
                  label="Issue description"
                  error={errors.description?.message}
                  hint="What happened, any error message, and what you've already tried."
                  aside={
                    <span className={cn("tabular font-mono text-[11px] text-muted-foreground", description.length > 4800 && "text-destructive")}>
                      {description.length}/5000
                    </span>
                  }
                >
                  <Textarea
                    rows={5}
                    maxLength={5000}
                    placeholder="Describe the problem in a few sentences…"
                    {...aria("description")}
                    {...register("description")}
                  />
                </Field>

                <Field id={id("priority")} label="Priority" error={errors.priority?.message}>
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <div role="radiogroup" id={id("priority")} className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                        {TICKET_PRIORITIES.map((p) => {
                          const meta = PRIORITY_META[p];
                          const selected = field.value === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => field.onChange(p)}
                              className={cn(
                                "relative flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-ring/20",
                                selected
                                  ? "border-foreground bg-card ring-1 ring-foreground"
                                  : "border-border bg-card hover:border-zinc-300 dark:hover:border-zinc-600",
                              )}
                            >
                              <span className="flex items-center justify-between">
                                <span className="text-[13px] font-semibold">{meta.label}</span>
                                <PriorityBars priority={p} />
                              </span>
                              <span className="text-xs leading-snug text-muted-foreground">{meta.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </Field>
              </div>
            </Section>

            <Section step="04" title="Attachments" description="Screenshots or photos of the problem help a lot." optional>
              <FilePicker files={files} onChange={setFiles} disabled={isPending} />
            </Section>

            <div className="flex flex-col-reverse items-stretch gap-4 border-t border-border bg-subtle px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-xs text-muted-foreground">
                Your request goes straight to the Zuse IT Support team.
              </p>
              <Button type="submit" size="lg" disabled={isPending} className="min-w-48">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {stage === "uploading" ? "Uploading files…" : "Submitting…"}
                  </>
                ) : (
                  <>
                    Submit request
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({
  step,
  title,
  description,
  optional,
  children,
}: {
  step: string;
  title: string;
  description: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid min-w-0 gap-6 border-b border-border px-5 py-7 last-of-type:border-b-0 sm:px-8 md:grid-cols-[200px_1fr] md:gap-10">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground">{step}</span>
        <h2 className="text-[15px] font-semibold">
          {title}
          {optional && <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>}
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </fieldset>
  );
}

function LookupSelect({
  control,
  name,
  items,
  placeholder,
  triggerProps,
}: {
  control: ReturnType<typeof useForm<TicketSubmission>>["control"];
  name: "departmentId" | "locationId";
  items: { id: string; name: string }[];
  placeholder: string;
  triggerProps: Record<string, unknown>;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          items={items.map((i) => ({ value: i.id, label: i.name }))}
          value={field.value || null}
          onValueChange={(value) => field.onChange(value ?? "")}
          onOpenChange={(open) => !open && field.onBlur()}
        >
          <SelectTrigger className="w-full" {...triggerProps}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

function OptionsUnavailable() {
  return (
    <p className="col-span-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      Options are unavailable right now. Please refresh the page or contact the IT office.
    </p>
  );
}

function FilePicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const full = files.length >= ATTACHMENT_RULES.maxFiles;

  const add = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= ATTACHMENT_RULES.maxFiles) {
        toast.error(`You can attach up to ${ATTACHMENT_RULES.maxFiles} files.`);
        break;
      }
      if (!(ATTACHMENT_RULES.accept as readonly string[]).includes(file.type)) {
        toast.error(`“${file.name}” isn't a supported file type.`);
        continue;
      }
      if (file.size > ATTACHMENT_RULES.maxBytes) {
        toast.error(`“${file.name}” is larger than 10 MB.`);
        continue;
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled || full}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60",
          dragging ? "border-foreground bg-muted/60" : "border-border bg-subtle hover:border-zinc-400 dark:hover:border-zinc-600",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-border bg-card shadow-[var(--shadow-soft)]">
          <UploadCloud className="size-[18px] text-muted-foreground" strokeWidth={1.75} />
        </span>
        <span className="text-sm">
          <span className="font-medium">{full ? "Maximum files added" : "Click to upload"}</span>
          {!full && <span className="text-muted-foreground"> or drag and drop</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          {ATTACHMENT_RULES.acceptLabel} · max {ATTACHMENT_RULES.maxFiles} files
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ATTACHMENT_RULES.accept.join(",")}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      <AnimatePresence initial={false}>
        {files.map((file) => {
          const Icon = file.type.startsWith("image/") ? ImageIcon : file.type === "application/pdf" ? FileText : Paperclip;
          return (
            <motion.div
              key={file.name + file.size}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{file.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onChange(files.filter((f) => f !== file))}
                >
                  <X />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
