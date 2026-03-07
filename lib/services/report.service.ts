import { prisma } from "@/lib/prisma";
import { normalizeUrl } from "@/lib/utils/normalize-url";
import { getSourceType } from "@/lib/utils/get-source-type";
import { processPost } from "@/lib/services/post-processing.service";
import { buildReportCommentContent } from "@/lib/types/comment";
import type { ReportResult } from "@/lib/types/report";
import type { CreateReportInput } from "@/lib/validators/report.validator";

export type { ReportResult } from "@/lib/types/report";

export async function createReport(
  userId: string,
  input: CreateReportInput
): Promise<ReportResult> {
  const normalized = normalizeUrl(input.sourceUrl);

  let post = await prisma.post.findUnique({
    where: { normalizedUrl: normalized },
  });

  let isNewPost = false;
  if (!post) {
    post = await prisma.post.create({
      data: {
        sourceUrl: input.sourceUrl,
        normalizedUrl: normalized,
        sourceType: getSourceType(input.sourceUrl),
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
        }),
      },
    });
    return [createdReport, updated];
  });

  if (isNewPost) {
    processPost(post.id).catch((err) =>
      console.error("Background processing failed:", err)
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
    },
    postReportCount: updatedPost.reportCount,
    ...(isNewPost && { postId: post.id }),
  };
}

export class ReportError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ReportError";
  }
}
