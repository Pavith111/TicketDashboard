export const TICKET_STATUSES = ["open", "in_progress", "on_hold", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const STAFF_ROLES = ["admin", "agent"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Semantic colours are used sparingly: a small dot next to monochrome text. */
export const STATUS_META: Record<TicketStatus, { label: string; dot: string }> = {
  open: { label: "Open", dot: "bg-sky-500" },
  in_progress: { label: "In progress", dot: "bg-amber-500" },
  on_hold: { label: "On hold", dot: "bg-violet-500" },
  resolved: { label: "Resolved", dot: "bg-emerald-500" },
  closed: { label: "Closed", dot: "bg-zinc-400 dark:bg-zinc-500" },
};

export const PRIORITY_META: Record<
  TicketPriority,
  { label: string; description: string; bars: number; tone: string }
> = {
  low: {
    label: "Low",
    description: "Minor inconvenience, work can continue",
    bars: 1,
    tone: "text-zinc-500 dark:text-zinc-400",
  },
  medium: {
    label: "Medium",
    description: "Affects my work, a workaround exists",
    bars: 2,
    tone: "text-sky-600 dark:text-sky-400",
  },
  high: {
    label: "High",
    description: "Blocks my work or a lesson",
    bars: 3,
    tone: "text-amber-600 dark:text-amber-400",
  },
  critical: {
    label: "Critical",
    description: "Many people affected or a system is down",
    bars: 4,
    tone: "text-red-600 dark:text-red-400",
  },
};

export const ROLE_META: Record<StaffRole, { label: string; description: string }> = {
  admin: { label: "Administrator", description: "Full access, including settings and team" },
  agent: { label: "Support agent", description: "Works tickets, cannot change settings" },
};

export const ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
] as const;

export const ATTACHMENT_RULES = {
  maxFiles: 3,
  maxBytes: 10 * 1024 * 1024,
  accept: ATTACHMENT_MIME_TYPES,
  acceptLabel: "Images, PDF, Office documents, TXT or ZIP · up to 10 MB each",
} as const;

export const TICKETS_PAGE_SIZE = 20;
