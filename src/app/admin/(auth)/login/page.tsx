import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-white/5 bg-[#09090b] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_bottom_left,black_20%,transparent_70%)]"
        />
        <div className="relative [&_.bg-foreground]:bg-white [&_.text-background]:text-black [&_.text-muted-foreground]:text-zinc-400">
          <Logo label="IT Support · Admin" />
        </div>
        <div className="relative max-w-md">
          <p className="font-mono text-xs tracking-wider text-zinc-500">ZT-OPS / CONSOLE</p>
          <h2 className="mt-4 text-4xl leading-[1.1] font-bold tracking-tight">
            Every request, triaged and tracked in one place.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
            The operations console for the Zuse IT Support team at Lyceum International
            School, Panadura.
          </p>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-zinc-500">
          <Lock className="size-3.5" /> Restricted to authorised IT Department staff.
        </p>
      </aside>

      {/* Form */}
      <main className="flex flex-col">
        <div className="flex h-16 items-center justify-between px-6 lg:justify-end">
          <span className="lg:hidden">
            <Logo label="IT Support · Admin" />
          </span>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in with your IT staff account.</p>
            <div className="mt-8">
              <Suspense fallback={<FormSkeleton />}>
                <LoginGate searchParams={searchParams} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

async function LoginGate({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const [{ userId, profile }, params] = await Promise.all([getSession(), searchParams]);
  if (profile) redirect("/admin");

  const next = typeof params.next === "string" ? params.next : undefined;
  // Signed in to Supabase but not an active member of the IT team.
  if (userId) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">
          You&apos;re signed in, but this account doesn&apos;t have access to the IT Support admin portal.
          Ask an administrator to add you to the IT team.
        </p>
        <SignOutButton variant="outline" />
      </div>
    );
  }

  return <LoginForm next={next} />;
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-11 rounded-xl" />
    </div>
  );
}
