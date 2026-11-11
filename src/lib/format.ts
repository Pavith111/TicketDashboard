import { format, formatDistanceToNowStrict } from "date-fns";

export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  return format(new Date(value), pattern);
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), "d MMM yyyy, h:mm a");
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
