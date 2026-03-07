import { prisma } from "@/lib/prisma";
import type { GetPostsInput } from "@/lib/validators/post.validator";
import type { PostRankingItem, PostRankingResult } from "@/lib/types/post";

export type { PostRankingItem, PostRankingResult } from "@/lib/types/post";

export async function getPostRanking(
  input: GetPostsInput
): Promise<PostRankingResult> {
  const { limit, category, page } = input;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (category) {
    where.aiPostCategories = {
      some: {
        category: { slug: category },
      },
    };
  }

  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [
        { reportCount: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        headline: true,
        sourceType: true,
        thumbnailUrl: true,
        reportCount: true,
        createdAt: true,
        _count: { select: { comments: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    posts: posts.map((p) => ({
      id: p.id,
      headline: p.headline,
      sourceType: p.sourceType,
      thumbnailUrl: p.thumbnailUrl,
      reportCount: p.reportCount,
      commentCount: p._count.comments,
      latestReportAt: p.reports[0]?.createdAt ?? null,
    })),
    totalCount,
    page,
    totalPages,
  };
}

export class PostServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "PostServiceError";
  }
}
