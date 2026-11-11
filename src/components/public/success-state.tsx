"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, CopyCheck, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuccessState({
  ticketNumber,
  email,
  failedUploads,
  onReset,
}: {
  ticketNumber: string;
  email: string;
  failedUploads: number;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="surface-elevated flex flex-col items-center px-6 py-14 text-center sm:px-12"
      role="status"
    >
      <div className="relative mb-7">
        <motion.span
          className="absolute inset-0 rounded-full border border-foreground/15"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 1.4, repeat: 2, ease: "easeOut" }}
        />
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
          className="relative flex size-16 items-center justify-center rounded-full bg-foreground text-background"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <Check className="size-7" strokeWidth={2.5} />
          </motion.span>
        </motion.div>
      </div>

      <h2 className="text-2xl font-bold sm:text-3xl">Request received</h2>
      <p className="mt-3 max-w-md text-[15px] text-pretty text-muted-foreground">
        Thank you. Our IT support team has your request and will be in touch at{" "}
        <span className="font-medium text-foreground">{email}</span>.
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-subtle p-5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Your ticket number
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl font-semibold tracking-tight">{ticketNumber}</span>
          <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Copy ticket number">
            {copied ? <CopyCheck /> : <Copy />}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">Quote this number if you contact IT about this issue.</span>
      </div>

      {failedUploads > 0 && (
        <p className="mt-5 flex max-w-md items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left text-sm text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {failedUploads === 1 ? "One attachment" : `${failedUploads} attachments`} could not be uploaded.
          Your ticket was still created. Reply with the file when IT contacts you.
        </p>
      )}

      <Button variant="outline" size="lg" className="mt-8" onClick={onReset}>
        <Plus className="size-4" />
        Submit another request
      </Button>
    </motion.div>
  );
}
