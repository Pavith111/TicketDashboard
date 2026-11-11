"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="surface">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="We couldn't load this page. Check your connection and try again."
        action={
          <Button variant="outline" onClick={reset}>
            <RotateCcw /> Try again
          </Button>
        }
      />
    </div>
  );
}
