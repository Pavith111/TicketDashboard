import { ShieldAlert } from "lucide-react";

export async function ForbiddenNotice({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (params.error !== "forbidden") return null;
  return (
    <div role="alert" className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <ShieldAlert className="size-4 shrink-0 text-muted-foreground" />
      That area is restricted to helpdesk administrators.
    </div>
  );
}
