"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "./use-theme";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme ?? "light"}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-card !text-foreground !shadow-[var(--shadow-elevated)] !font-sans",
          description: "!text-muted-foreground",
          closeButton: "!bg-card !border-border !text-muted-foreground",
        },
      }}
    />
  );
}
