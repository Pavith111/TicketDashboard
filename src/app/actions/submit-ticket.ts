"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ATTACHMENT_BUCKET } from "@/lib/env";
import { ATTACHMENT_RULES } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/service";
import { attachmentMetaSchema, ticketSubmissionSchema } from "@/lib/validations";
import type { ActionResult } from "@/lib/types";

export type SubmitTicketResult = ActionResult<{
  ticketNumber: string;
  uploads: { path: string; token: string; index: number }[];
}>;

const filesSchema = z.array(attachmentMetaSchema).max(ATTACHMENT_RULES.maxFiles);

const RATE_LIMIT = { windowMinutes: 15, maxPerEmail: 5 };

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(-80);
  return cleaned || "file";
}

/**
 * Public ticket intake. No authentication: the input is validated here and
 * written with the service-role key, so the anon key never needs write access
 * to the tickets table.
 */
export async function submitTicket(input: unknown, files: unknown): Promise<SubmitTicketResult> {
  const parsed = ticketSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const parsedFiles = filesSchema.safeParse(files ?? []);
  if (!parsedFiles.success) {
    return { ok: false, error: parsedFiles.error.issues[0]?.message ?? "Invalid attachment." };
  }

  const values = parsed.data;

  // Honeypot tripped: pretend everything worked so bots learn nothing.
  if (values.website) {
    return { ok: true, data: { ticketNumber: "ZT-0000-00000", uploads: [] } };
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return {
      ok: false,
      error: "The helpdesk is not connected yet. Please contact the IT office directly.",
    };
  }

  const email = values.email.toLowerCase();

  // Basic abuse protection: cap submissions per email address.
  const since = new Date(Date.now() - RATE_LIMIT.windowMinutes * 60_000).toISOString();
  const { count: recent } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("requester_email", email)
    .gte("created_at", since);
  if ((recent ?? 0) >= RATE_LIMIT.maxPerEmail) {
    return {
      ok: false,
      error: "You've submitted several tickets in a short time. Please wait a few minutes.",
    };
  }

  // Make sure the selected options exist and are still enabled.
  const [dept, cat, loc] = await Promise.all([
    supabase.from("departments").select("id").eq("id", values.departmentId).eq("is_active", true).maybeSingle(),
    supabase.from("categories").select("id").eq("id", values.categoryId).eq("is_active", true).maybeSingle(),
    supabase.from("locations").select("id").eq("id", values.locationId).eq("is_active", true).maybeSingle(),
  ]);
  const fieldErrors: Record<string, string[]> = {};
  if (!dept.data) fieldErrors.departmentId = ["This department is no longer available"];
  if (!cat.data) fieldErrors.categoryId = ["This category is no longer available"];
  if (!loc.data) fieldErrors.locationId = ["This location is no longer available"];
  if (Object.keys(fieldErrors).length) {
    return { ok: false, error: "Some options have changed. Please reselect them.", fieldErrors };
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      requester_name: values.fullName,
      requester_email: email,
      requester_phone: values.phone || null,
      department_id: values.departmentId,
      location_id: values.locationId,
      room: values.room || null,
      category_id: values.categoryId,
      title: values.title,
      description: values.description,
      priority: values.priority,
    })
    .select("id, ticket_number")
    .single<{ id: string; ticket_number: string }>();

  if (error || !ticket) {
    console.error("[submitTicket] insert failed", error?.message);
    return { ok: false, error: "We couldn't submit your ticket. Please try again." };
  }

  // Issue one signed upload URL per declared file. The browser uploads the
  // bytes directly to private storage, so large files never pass through here.
  const uploads: { path: string; token: string; index: number }[] = [];
  for (const [index, file] of parsedFiles.data.entries()) {
    const path = `${ticket.id}/${randomUUID()}-${safeFileName(file.name)}`;
    const { data: signed, error: signError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUploadUrl(path);
    if (signError || !signed) continue;

    const { error: rowError } = await supabase.from("ticket_attachments").insert({
      ticket_id: ticket.id,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });
    if (!rowError) uploads.push({ path, token: signed.token, index });
  }

  return { ok: true, data: { ticketNumber: ticket.ticket_number, uploads } };
}
