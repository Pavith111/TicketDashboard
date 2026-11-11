"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const [pending, start] = useTransition();
  return (
    <Button variant={variant} disabled={pending} onClick={() => start(() => signOut())}>
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      Sign out
    </Button>
  );
}
