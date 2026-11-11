"use client";

import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CircleAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/app/admin/actions";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm({ next }: { next?: string }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await signIn(values, next);
      // On success the action redirects, so we only get here on failure.
      if (result && !result.ok) setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Field id={`${id}-email`} label="Email" error={formState.errors.email?.message}>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="username"
          autoFocus
          placeholder="Your work email"
          aria-invalid={formState.errors.email ? true : undefined}
          {...register("email")}
        />
      </Field>

      <Field id={`${id}-password`} label="Password" error={formState.errors.password?.message}>
        <div className="relative">
          <Input
            id={`${id}-password`}
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            aria-invalid={formState.errors.password ? true : undefined}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "Signing in…" : "Sign in"}
        {!isPending && <ArrowRight className="size-4" />}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Forgot your password? Ask an IT Support administrator to reset it.
      </p>
    </form>
  );
}
