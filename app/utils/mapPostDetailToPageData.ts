import type { ListingDetailData, PostDetailApiResponse } from "@/types/types";
import type { ChatMessage } from "@/types/types";
import { mapSourceTypeToClaimSource } from "@/app/utils/mapSourceType";

const FALLBACK_THUMBNAIL = "/medical_claim.png";
const UNKNOWN_USER_NAME = "User";

const MESSAGE_POST_SOURCE_TYPES = new Set([
  "WHATSAPP_CHAT",
  "TELEGRAM_CHAT",
  "FACEBOOK_CHAT",
  "INSTAGRAM_CHAT",
  "SIGNAL_CHAT",
  "CHAT_OTHER",
]);

function isMessagePostSourceType(sourceType: string): boolean {
  return MESSAGE_POST_SOURCE_TYPES.has(sourceType) || sourceType.endsWith("_CHAT");
}

interface ReportCommentContent {
  type?: string;
  reportDescription?: string;
  supportingEvidence?: string | null;
  headline?: string;
  messages?: ChatMessage[];
}

function parseCommentContent(content: string): {
  comment: string | null;
  userDescription: string | null;
  supportingEvidence: string | null;
  messages: ChatMessage[] | undefined;
} {
  try {
    const parsed = JSON.parse(content) as ReportCommentContent;
    if (parsed?.type === "report") {
      return {
        comment: parsed.reportDescription ?? null,
        userDescription: parsed.headline ?? null,
        supportingEvidence: parsed.supportingEvidence ?? null,
        messages: parsed.messages,
      };
    }
  } catch {
    // Plain text comment
  }
  return {
    comment: content || null,
    userDescription: null,
    supportingEvidence: null,
    messages: undefined,
  };
}

/**
 * Maps GET /api/posts/[id] response to the shape expected by the listing detail page.
 */
export function mapPostDetailToPageData(
  response: PostDetailApiResponse
): ListingDetailData {
  const { post, comments } = response;
  const isMessagePost = isMessagePostSourceType(post.sourceType);

  const mappedComments = comments.map((c) => {
    const { comment, userDescription, supportingEvidence, messages } =
      parseCommentContent(c.content);
    return {
      user: { id: 0, name: c.userName ?? UNKNOWN_USER_NAME },
      comment,
      supportingEvidence,
      userDescription,
      messages,
      createdAt: new Date(c.createdAt),
    };
  });

  const firstCommentWithMessages = mappedComments.find(
    (c) => c.messages != null && c.messages.length > 0
  );
  const topMessages =
    isMessagePost && firstCommentWithMessages?.messages != null
      ? firstCommentWithMessages.messages
      : null;

  return {
    id: post.id,
    title: post.headline ?? "Untitled",
    sourceType: mapSourceTypeToClaimSource(post.sourceType),
    sourceUrl: post.sourceUrl,
    imgUrl: post.thumbnailUrl ?? FALLBACK_THUMBNAIL,
    time: new Date(post.createdAt),
    aiSummary: post.aiSummary ?? "",
    credibility: post.aiTransparencyNotes ?? "",
    transparency: post.aiTransparencyNotes ?? "",
    score: post.aiCredibilityScore ?? 0,
    isMessagePost,
    topMessages,
    comments: mappedComments,
  };
}
