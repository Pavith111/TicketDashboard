"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTicket } from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteTicketButton({ ticketId, ticketNumber }: { ticketId: string; ticketNumber: string }) {
  const [pending, start] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="justify-start text-muted-foreground hover:text-destructive" />}>
        <Trash2 />
        Delete ticket
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {ticketNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the ticket, its attachments, internal notes and history. This cannot
            be undone. To keep a record, close the ticket instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await deleteTicket(ticketId);
                if (result && !result.ok) toast.error(result.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
