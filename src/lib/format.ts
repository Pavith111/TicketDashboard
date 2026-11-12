import { formatDistanceToNowStrict } from "date-fns";

/**
 * All dates are shown in Sri Lanka time, regardless of where the code runs
 * (Vercel servers use UTC; a visitor's browser may be anywhere).
 */
export const TIME_ZONE = "Asia/Colombo";
/** Asia/Colombo is a fixed UTC+05:30 with no daylight saving. */
const TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function zonedParts(value: string | Date) {
  const map: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(new Date(value))) map[part.type] = part.value;
  return map;
}

/** Supports the tokens `d`, `MMM` and `yyyy`, e.g. "d MMM yyyy", "d MMM", "MMM yyyy". */
export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  const p = zonedParts(value);
  return pattern.replace(/yyyy|MMM|d/g, (token) =>
    token === "yyyy" ? p.year : token === "MMM" ? p.month : p.day,
  );
}

export function formatDateTime(value: string | Date) {
  const p = zonedParts(value);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod.toUpperCase()}`;
}

/** Midnight (start of the current day) in Sri Lanka, as a real instant. */
export function startOfTodayInTimeZone(now = new Date()) {
  const day = 24 * 60 * 60 * 1000;
  return new Date(Math.floor((now.getTime() + TZ_OFFSET_MS) / day) * day - TZ_OFFSET_MS);
}

export function timeAgo(value: string | Date) {
  return `${formatDistanceToNowStrict(new Date(value))} ago`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(hours: number | null) {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
