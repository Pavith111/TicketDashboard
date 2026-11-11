"use client";

import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, CircleDot, Loader2, Lock, Send, Sparkles, Trash2, UserRound } from "lucide-react";
import { addNote, deleteNote } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_META, STATUS_META, type TicketPriority, type TicketStatus } from "@/lib/constants";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { TicketActivity, TicketNote } from "@/lib/types";
import { Avatar } from "./user-menu";

type Entry =
  | { kind: "note"; at: string; note: TicketNote }
  | { kind: "event"; at: string; event: TicketActivity };

function describe(event: TicketActivity) {
  const label = (v: string | null) => {
    if (!v) return "nobody";
    if (event.action === "status") return STATUS_META[v as TicketStatus]?.label ?? v;
    if (event.action === "priority") return PRIORITY_META[v as TicketPriority]?.label ?? v;
    return v;
  };
  switch (event.action) {
    case "created":
      return { icon: Sparkles, text: <>Ticket submitted from the staff portal</> };
    case "status":
      return { icon: CircleDot, text: <>changed status <Change from={label(event.from_value)} to={label(event.to_value)} /></> };
    case "priority":
      return { icon: CircleDot, text: <>changed priority <Change from={label(event.from_value)} to={label(event.to_value)} /></> };
    case "assignment":
      return {
        icon: UserRound,
        text: event.to_value ? <>assigned the ticket to <b className="font-medium text-foreground">{event.to_value}</b></> : <>removed the assignee</>,
      };
    default:
      return { icon: CircleDot, text: <>{event.action}</> };
  }
}

function Change({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground line-through decoration-muted-foreground/40">{from}</span>
      <ArrowRight className="size-3" />
      <b className="font-medium text-foreground">{to}</b>
    </span>
  );
}

export function TicketTimeline({
  ticketId,
  notes,
  activity,
  currentUserId,
  isAdmin,
}: {
  ticketId: string;
  notes: TicketNote[];
  activity: TicketActivity[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  const entries: Entry[] = [
    ...notes.map((note) => ({ kind: "note" as const, at: note.created_at, note })),
    ...activity.map((event) => ({ kind: "event" as const, at: event.created_at, event })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const result = await addNote({ ticketId, body: text });
      if (result.ok) {
        setBody("");
        toast.success("Internal note added");
      } else toast.error(result.error);
    });
  };

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-[15px] font-semibold">Activity & internal notes</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> Only IT staff can see notes. They are never shown to the requester.
          </p>
        </div>
      </div>

      <div className="border-b border-border bg-subtle p-4 sm:p-5">
        <Textarea
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          placeholder="Add an internal note: steps taken, findings, parts ordered…"
          className="min-h-20 bg-card"
          maxLength={5000}
          aria-label="Internal note"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            <kbd className="rounded border border-border bg-card px-1 font-mono text-[10px]">Ctrl</kbd> +{" "}
            <kbd className="rounded border border-border bg-card px-1 font-mono text-[10px]">Enter</kbd> to post
          </span>
          <Button onClick={submit} disabled={pending || !body.trim()} className="ml-auto">
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            Add note
          </Button>
        </div>
      </div>

      <ol className="relative px-5 py-6 sm:px-6">
        <span aria-hidden className="absolute top-6 bottom-6 left-[35px] w-px bg-border sm:left-[39px]" />
        <AnimatePresence initial={false}>
          {entries.map((entry) =>
            entry.kind === "note" ? (
              <motion.li
                key={`n-${entry.note.id}`}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                <Avatar name={entry.note.author?.full_name ?? "?"} className="relative z-10 ring-4 ring-card" />
                <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground">{entry.note.author?.full_name ?? "Former staff"}</span>
                    <span className="text-muted-foreground" title={formatDateTime(entry.at)}>
                      {timeAgo(entry.at)}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      <Lock className="size-2.5" /> Internal
                    </span>
                    {(entry.note.author?.id === currentUserId || isAdmin) && (
                      <NoteDelete id={entry.note.id} />
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.note.body}</p>
                </div>
              </motion.li>
            ) : (
              <EventItem key={`e-${entry.event.id}`} event={entry.event} />
            ),
          )}
        </AnimatePresence>
      </ol>
    </section>
  );
}

function EventItem({ event }: { event: TicketActivity }) {
  const { icon: Icon, text } = describe(event);
  return (
    <motion.li layout className="relative flex items-start gap-4 pb-6 last:pb-0">
      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card ring-4 ring-card">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
      <p className="pt-1.5 text-[13px] text-muted-foreground">
        {event.action !== "created" && (
          <b className="font-medium text-foreground">{event.actor?.full_name ?? "System"} </b>
        )}
        {text}
        <span className="ml-2 text-xs" title={formatDateTime(event.created_at)}>
          · {timeAgo(event.created_at)}
        </span>
      </p>
    </motion.li>
  );
}

function NoteDelete({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Delete note"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await deleteNote(id);
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
