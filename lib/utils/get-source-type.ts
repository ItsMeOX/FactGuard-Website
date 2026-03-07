export type SourceType =
  | "TIKTOK"
  | "X"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "REDDIT"
  | "WEBPAGE";

export function getSourceType(url: string): SourceType {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("tiktok.com")) return "TIKTOK";
  if (hostname.includes("x.com") || hostname.includes("twitter.com"))
    return "X";
  if (hostname.includes("facebook.com") || hostname.includes("fb.com"))
    return "FACEBOOK";
  if (hostname.includes("reddit.com")) return "REDDIT";
  if (hostname.includes("instagram.com")) return "INSTAGRAM";

  return "WEBPAGE";
}
