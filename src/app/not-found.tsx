import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo />
      <div>
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
        <p className="mt-3 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      </div>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        <ArrowLeft className="size-4" />
        Back to IT Support
      </Link>
    </div>
  );
}
