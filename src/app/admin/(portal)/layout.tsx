import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { MobileNav, SidebarNav, SidebarNavSkeleton } from "@/components/admin/sidebar-nav";
import { UserMenu } from "@/components/admin/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { getTicketCounts } from "@/lib/data/tickets";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Zuse IT Admin" } };

export default function PortalLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <Logo label="IT Helpdesk · Admin" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Suspense fallback={<SidebarNavSkeleton />}>
            <Navigation />
          </Suspense>
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Suspense fallback={<Skeleton className="h-12 rounded-xl" />}>
            <CurrentUser />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Suspense fallback={<Skeleton className="size-9 rounded-lg lg:hidden" />}>
            <MobileNavigation />
          </Suspense>
          <span className="lg:hidden">
            <Logo />
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span className="lg:hidden">
              <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
                <CurrentUser compact />
              </Suspense>
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

async function Navigation() {
  const profile = await requireStaff();
  const counts = await getTicketCounts(profile.id);
  return <SidebarNav role={profile.role} counts={counts} />;
}

async function MobileNavigation() {
  const profile = await requireStaff();
  const counts = await getTicketCounts(profile.id);
  return <MobileNav role={profile.role} counts={counts} />;
}

async function CurrentUser({ compact }: { compact?: boolean }) {
  const profile = await requireStaff();
  return <UserMenu profile={profile} compact={compact} />;
}
