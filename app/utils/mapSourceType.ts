import { ClaimSource } from "@/types/types";

const SOURCE_TYPE_TO_CLAIM_SOURCE: Record<string, ClaimSource> = {
  WEBPAGE: ClaimSource.WEBPAGE,
  FACEBOOK: ClaimSource.FACEBOOK,
  X: ClaimSource.X,
  TIKTOK: ClaimSource.TIKTOK,
  INSTAGRAM: ClaimSource.INSTAGRAM,
  REDDIT: ClaimSource.REDDIT,
  WHATSAPP_CHAT: ClaimSource.WHATSAPP,
  TELEGRAM_CHAT: ClaimSource.TELEGRAM,
  FACEBOOK_CHAT: ClaimSource.FACEBOOK,
  INSTAGRAM_CHAT: ClaimSource.INSTAGRAM,
  SIGNAL_CHAT: ClaimSource.SIGNAL,
  CHAT_OTHER: ClaimSource.WEBPAGE,
};

/**
 * Maps API sourceType string to frontend ClaimSource enum. Unknown types fall back to WEBPAGE.
 */
export function mapSourceTypeToClaimSource(sourceType: string): ClaimSource {
  const normalized = sourceType?.toUpperCase?.() ?? "";
  return SOURCE_TYPE_TO_CLAIM_SOURCE[normalized] ?? ClaimSource.WEBPAGE;
}
