import normalizeUrlConfig from "@/lib/config/normalize-url.config.json";

const TRACKING_PARAMS = new Set(normalizeUrlConfig.trackingParams);

export function normalizeUrl(raw: string): string {
  const url = new URL(raw);

  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();

  url.hash = "";

  const cleaned = new URLSearchParams();
  const sorted = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  for (const [key, value] of sorted) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      cleaned.append(key, value);
    }
  }
  url.search = cleaned.toString() ? `?${cleaned.toString()}` : "";

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";

  return url.toString();
}
