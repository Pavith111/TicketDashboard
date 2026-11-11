import Link from "next/link";
import { TicketX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function TicketNotFound() {
  return (
    <div className="surface">
      <EmptyState
        icon={TicketX}
        title="Ticket not found"
        description="It may have been deleted, or the link is incorrect."
        action={
          <Link href="/admin/tickets" className={buttonVariants({ variant: "outline" })}>
            Back to tickets
          </Link>
        }
      />
    </div>
  );
}
