import { prisma } from "@/lib/prisma";
import type { GetCategoryRankingInput } from "@/lib/validators/category.validator";
import type {
  CategoryRankingItem,
  CategoryRankingResult,
  CategoryRow,
} from "@/lib/types/category-ranking";
import categoryRankingConfig from "@/lib/config/category-ranking.config.json";

export type { CategoryRankingItem, CategoryRankingResult } from "@/lib/types/category-ranking";

export async function getCategoryRanking(
  input: GetCategoryRankingInput
): Promise<CategoryRankingResult> {
  const { limit } = input;
  const postsPerCategory = categoryRankingConfig.postsPerCategory;

  const topCategories = await prisma.$queryRaw<CategoryRow[]>`
    SELECT c.id, c.slug, c.name, SUM(p.report_count) AS total_report_count
    FROM categories c
    JOIN ai_post_categories apc ON apc.category_id = c.id
    JOIN posts p ON p.id = apc.post_id
    GROUP BY c.id, c.slug, c.name
    ORDER BY total_report_count DESC
    LIMIT ${limit}
  `;

  if (topCategories.length === 0) {
    return { categories: [] };
  }

  const categoryIds = topCategories.map((c) => c.id);

  const postsByCategory = await Promise.all(
    categoryIds.map((categoryId) =>
      prisma.post.findMany({
        where: {
          aiPostCategories: {
            some: { categoryId },
          },
        },
        orderBy: [
          { reportCount: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        take: postsPerCategory,
        select: {
          id: true,
          headline: true,
          sourceType: true,
          thumbnailUrl: true,
          reportCount: true,
          _count: { select: { comments: true } },
          reports: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      })
    )
  );

  const categories: CategoryRankingItem[] = topCategories.map((row, index) => ({
    category: {
      id: row.id,
      slug: row.slug,
      name: row.name,
    },
    totalReportCount: Number(row.total_report_count),
    posts: postsByCategory[index].map((p) => ({
      id: p.id,
      headline: p.headline,
      sourceType: p.sourceType,
      thumbnailUrl: p.thumbnailUrl,
      reportCount: p.reportCount,
      commentCount: p._count.comments,
      latestReportAt: p.reports[0]?.createdAt ?? null,
    })),
  }));

  return { categories };
}
