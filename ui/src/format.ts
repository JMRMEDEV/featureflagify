/**
 * Formats an ISO 8601 UTC timestamp as `YYYY-MM-DD HH:mm UTC`. Deterministic: it ignores
 * the locale and the time zone of the machine. A value that is not a date is returned as is.
 */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
