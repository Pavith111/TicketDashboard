"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
};

export function Field({ id, label, optional, hint, error, className, children, aside }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
          {optional ? (
            <span className="ml-1.5 font-normal text-muted-foreground">Optional</span>
          ) : (
            <span aria-hidden className="ml-0.5 text-muted-foreground">
              *
            </span>
          )}
        </label>
        {aside}
      </div>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 text-[12.5px] text-destructive"
          >
            <CircleAlert className="size-3.5 shrink-0" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            id={`${id}-hint`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[12.5px] text-muted-foreground"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
