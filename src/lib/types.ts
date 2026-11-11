import type { StaffRole, TicketPriority, TicketStatus } from "./constants";

export type LookupKind = "departments" | "categories" | "locations";

export type Lookup = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  icon?: string;
};

export type PublicLookups = {
  departments: Lookup[];
  categories: Lookup[];
  locations: Lookup[];
};

export type StaffProfile = {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
};

export type TicketListItem = {
  id: string;
  ticket_number: string;
  title: string;
  requester_name: string;
  requester_email: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  department: { name: string } | null;
  category: { name: string; icon: string } | null;
  location: { name: string } | null;
  assignee: { id: string; full_name: string } | null;
};

export type TicketDetail = TicketListItem & {
  requester_phone: string | null;
  room: string | null;
  description: string;
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
};

export type TicketAttachment = {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url: string | null;
};

export type TicketNote = {
  id: string;
  body: string;
  created_at: string;
  author: { id: string; full_name: string } | null;
};

export type TicketActivity = {
  id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  actor: { full_name: string } | null;
};

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
