/**
 * Returns "X hour(s) ago" from now, with hours rounded down. Returns "—" when date is missing.
 */
export function formatHoursAgo(date: Date | undefined): string {
  if (date == null) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours <= 0) return "just now";
  if (diffHours === 1) return "1 hour ago";
  return `${diffHours} hours ago`;
}
