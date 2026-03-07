import { prisma } from "@/lib/prisma";
import type { GetPostsInput } from "@/lib/validators/post.validator";
import type {
  PostRankingItem,
  PostRankingResult,
  PostDetail,
  PostDetailComment,
} from "@/lib/types/post";

export type { PostRankingItem, PostRankingResult, PostDetail } from "@/lib/types/post";

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

export async function getPostById(postId: string): Promise<PostDetail | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      sourceUrl: true,
      sourceType: true,
      headline: true,
      thumbnailUrl: true,
      aiSummary: true,
      aiCredibilityScore: true,
      aiTransparencyNotes: true,
      reportCount: true,
      createdAt: true,
      reports: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          headline: true,
          platform: true,
          reportDescription: true,
          supportingEvidence: true,
          status: true,
          createdAt: true,
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          content: true,
          createdAt: true,
          parentCommentId: true,
        },
      },
      aiPostCategories: {
        select: {
          confidence: true,
          category: { select: { slug: true, name: true } },
        },
      },
    },
  });

  if (!post) return null;

  const commentMap = new Map<string, PostDetailComment>();
  for (const c of post.comments) {
    commentMap.set(c.id, {
      id: c.id,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt,
      parentCommentId: c.parentCommentId,
      replies: [],
    });
  }
  const rootComments: PostDetailComment[] = [];
  for (const c of post.comments) {
    const node = commentMap.get(c.id)!;
    if (c.parentCommentId == null) {
      rootComments.push(node);
    } else {
      const parent = commentMap.get(c.parentCommentId);
      if (parent) parent.replies.push(node);
      else rootComments.push(node);
    }
  }

  return {
    post: {
      id: post.id,
      sourceUrl: post.sourceUrl,
      sourceType: post.sourceType,
      headline: post.headline,
      thumbnailUrl: post.thumbnailUrl,
      aiSummary: post.aiSummary,
      aiCredibilityScore: post.aiCredibilityScore,
      aiTransparencyNotes: post.aiTransparencyNotes,
      reportCount: post.reportCount,
      createdAt: post.createdAt,
      categories: post.aiPostCategories.map((apc) => ({
        slug: apc.category.slug,
        name: apc.category.name,
        confidence: apc.confidence,
      })),
    },
    reports: post.reports.map((r) => ({
      id: r.id,
      headline: r.headline,
      platform: r.platform,
      reportDescription: r.reportDescription,
      supportingEvidence: r.supportingEvidence,
      status: r.status,
      createdAt: r.createdAt,
    })),
    comments: rootComments,
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
