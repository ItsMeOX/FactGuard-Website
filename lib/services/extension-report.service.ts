import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { processPost } from "@/lib/services/post-processing.service";
import { ReportError } from "@/lib/services/report.service";
import { buildReportCommentContent } from "@/lib/types/comment";
import type { ReportResult } from "@/lib/types/report";
import type { ExtensionChatReportInput } from "@/lib/validators/extension-report.validator";

import platformThumbnailsConfig from "@/lib/config/platform-thumbnails.config.json";

export type { ReportResult } from "@/lib/types/report";
export { ReportError } from "@/lib/services/report.service";

const CHAT_SOURCE_TYPE_MAP: Record<string, string> = {
  whatsapp: "WHATSAPP_CHAT",
  facebook: "FACEBOOK_CHAT",
  telegram: "TELEGRAM_CHAT",
  instagram: "INSTAGRAM_CHAT",
  signal: "SIGNAL_CHAT",
};

const DEFAULT_CHAT_SOURCE_TYPE = "CHAT_OTHER";

function buildChatNormalizedKey(
  platform: string,
  input: ExtensionChatReportInput
): string {
  const normalizedPlatform = platform.toLowerCase().trim();
  if (input.conversationKey?.trim()) {
    return `chat:${normalizedPlatform}:${input.conversationKey.trim()}`;
  }
  const serialized = input.messages
    .map((m) => `${m.sender}:${m.text}`)
    .join(";");
  const hash = createHash("sha256").update(serialized).digest("hex");
  return `chat:${normalizedPlatform}:${hash}`;
}

function getChatSourceType(platform: string): string {
  const key = platform.toLowerCase().trim();
  return CHAT_SOURCE_TYPE_MAP[key] ?? DEFAULT_CHAT_SOURCE_TYPE;
}

function getPlatformThumbnailUrl(platform: string): string | null {
  const key = platform.toLowerCase().trim();
  const config = platformThumbnailsConfig as Record<string, string>;
  const url = config[key];
  return typeof url === "string" && url.trim() !== "" ? url.trim() : null;
}

export async function createExtensionChatReport(
  userId: string,
  input: ExtensionChatReportInput
): Promise<ReportResult> {
  const normalizedKey = buildChatNormalizedKey(input.platform, input);

  let post = await prisma.post.findUnique({
    where: { normalizedUrl: normalizedKey },
  });

  let isNewPost = false;
  if (!post) {
    const sourceUrl = `Chat conversation on ${input.platform} (no public URL)`;
    const sourceType = getChatSourceType(input.platform);
    const thumbnailUrl = getPlatformThumbnailUrl(input.platform);

    post = await prisma.post.create({
      data: {
        sourceUrl,
        normalizedUrl: normalizedKey,
        sourceType,
        thumbnailUrl,
        processedStatus: "pending",
      },
    });
    isNewPost = true;
  }

  const existing = await prisma.report.findUnique({
    where: { postId_userId: { postId: post.id, userId } },
  });
  if (existing) {
    throw new ReportError("You have already reported this post", 409);
  }

  const [report, updatedPost] = await prisma.$transaction(async (tx) => {
    const createdReport = await tx.report.create({
      data: {
        postId: post.id,
        userId,
        headline: input.headline,
        platform: input.platform,
        reportDescription: input.reportDescription,
        supportingEvidence: input.supportingEvidence ?? null,
      },
    });
    const updated = await tx.post.update({
      where: { id: post.id },
      data: { reportCount: { increment: 1 } },
    });
    await tx.comment.create({
      data: {
        postId: post.id,
        userId,
        content: buildReportCommentContent({
          reportId: createdReport.id,
          headline: input.headline,
          reportDescription: input.reportDescription,
          supportingEvidence: input.supportingEvidence ?? null,
          messages: input.messages,
        }),
      },
    });
    return [createdReport, updated];
  });

  if (isNewPost) {
    processPost(post.id).catch((err) =>
      console.error("Extension chat-report: background processing failed:", err)
    );
  }

  return {
    report: {
      id: report.id,
      headline: report.headline,
      reportDescription: report.reportDescription,
      supportingEvidence: report.supportingEvidence,
      platform: report.platform,
      status: report.status,
      createdAt: report.createdAt,
      messages: input.messages,
    },
    postReportCount: updatedPost.reportCount,
    ...(isNewPost && { postId: post.id }),
  };
}
