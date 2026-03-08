const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const DAYS_THRESHOLD_FOR_ABSOLUTE = 30;

/**
 * Returns a human-readable relative time string for a past date (e.g. "5 minutes ago", "2 days ago").
 * Dates older than DAYS_THRESHOLD_FOR_ABSOLUTE are shown as a locale date string.
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < SECONDS_PER_MINUTE) {
    return "just now";
  }
  if (diffSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(diffSeconds / SECONDS_PER_MINUTE);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(diffSeconds / SECONDS_PER_HOUR);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (diffSeconds < DAYS_THRESHOLD_FOR_ABSOLUTE * SECONDS_PER_DAY) {
    const days = Math.floor(diffSeconds / SECONDS_PER_DAY);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
