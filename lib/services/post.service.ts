import { prisma } from "@/lib/prisma";
import type { GetPostsInput } from "@/lib/validators/post.validator";

export type PostRankingItem = {
  id: string;
  headline: string | null;
  sourceType: string;
  thumbnailUrl: string | null;
  reportCount: number;
  latestReportAt: Date | null;
};

export type PostRankingResult = {
  posts: PostRankingItem[];
  nextCursor: string | null;
};

type CursorPayload = {
  reportCount: number;
  createdAt: string;
  id: string;
};

export function encodeCursor(post: {
  reportCount: number;
  createdAt: Date;
  id: string;
}): string {
  const payload: CursorPayload = {
    reportCount: post.reportCount,
    createdAt: post.createdAt.toISOString(),
    id: post.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (
      typeof parsed.reportCount !== "number" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    ) {
      throw new Error("Invalid cursor shape");
    }
    return parsed as CursorPayload;
  } catch {
    throw new PostServiceError("Invalid cursor", 400);
  }
}

export async function getPostRanking(
  input: GetPostsInput
): Promise<PostRankingResult> {
  const { limit, category, cursor } = input;
  const take = limit + 1;

  const where: Record<string, unknown> = {};

  if (category) {
    where.aiPostCategories = {
      some: {
        category: { slug: category },
      },
    };
  }

  if (cursor) {
    const decoded = decodeCursor(cursor);
    where.OR = [
      { reportCount: { lt: decoded.reportCount } },
      {
        reportCount: decoded.reportCount,
        createdAt: { lt: new Date(decoded.createdAt) },
      },
      {
        reportCount: decoded.reportCount,
        createdAt: new Date(decoded.createdAt),
        id: { lt: decoded.id },
      },
    ];
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: [
      { reportCount: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take,
    select: {
      id: true,
      headline: true,
      sourceType: true,
      thumbnailUrl: true,
      reportCount: true,
      createdAt: true,
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    posts.pop();
    const lastPost = posts[posts.length - 1];
    nextCursor = encodeCursor({
      reportCount: lastPost.reportCount,
      createdAt: lastPost.createdAt,
      id: lastPost.id,
    });
  }

  return {
    posts: posts.map((p) => ({
      id: p.id,
      headline: p.headline,
      sourceType: p.sourceType,
      thumbnailUrl: p.thumbnailUrl,
      reportCount: p.reportCount,
      latestReportAt: p.reports[0]?.createdAt ?? null,
    })),
    nextCursor,
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
