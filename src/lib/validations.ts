import { z } from "zod";
import {
  ATTACHMENT_MIME_TYPES,
  ATTACHMENT_RULES,
  STAFF_ROLES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "./constants";

const required = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);

const optional = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional();

const requiredId = (label: string) =>
  z.string({ error: `Select a ${label}` }).min(1, `Select a ${label}`).uuid(`Select a ${label}`);

export const attachmentMetaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  size: z
    .number()
    .int()
    .positive()
    .max(ATTACHMENT_RULES.maxBytes, "Each file must be 10 MB or smaller"),
  type: z.enum(ATTACHMENT_MIME_TYPES, { error: "This file type is not supported" }),
});
export type AttachmentMeta = z.infer<typeof attachmentMetaSchema>;

export const ticketSubmissionSchema = z.object({
  fullName: required(2, 120, "Full name"),
  email: z
    .string()
    .trim()
    .min(1, "Staff email is required")
    .email("Enter a valid email address")
    .max(254),
  phone: z
    .string()
    .trim()
    .max(30, "Contact number is too long")
    .regex(/^[+()\d\s-]*$/, "Use digits, spaces, + ( ) or - only")
    .optional(),
  departmentId: requiredId("department"),
  locationId: requiredId("location / building"),
  room: optional(80, "Room / lab"),
  categoryId: requiredId("issue category"),
  title: required(4, 150, "Issue title"),
  description: required(10, 5000, "Description"),
  priority: z.enum(TICKET_PRIORITIES, { error: "Choose a priority" }),
  /** Honeypot. Hidden from people, tempting to bots. */
  website: z.string().max(0).optional(),
});
export type TicketSubmission = z.infer<typeof ticketSubmissionSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const ticketUpdateSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});
export type TicketUpdate = z.infer<typeof ticketUpdateSchema>;

export const noteSchema = z.object({
  ticketId: z.string().uuid(),
  body: required(1, 5000, "Note"),
});

export const lookupSchema = z.object({
  name: required(2, 60, "Name"),
  icon: z.string().trim().max(40).optional(),
});
export type LookupInput = z.infer<typeof lookupSchema>;

export const staffCreateSchema = z.object({
  fullName: required(2, 120, "Full name"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(10, "Use at least 10 characters").max(72, "Use 72 characters or fewer"),
  role: z.enum(STAFF_ROLES),
});
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
