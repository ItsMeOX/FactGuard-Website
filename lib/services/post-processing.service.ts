import { prisma } from "@/lib/prisma";
import { analyzePost } from "@/lib/services/ai-analysis.service";

export async function processPost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    console.error(`processPost: post ${postId} not found`);
    return;
  }

  await prisma.post.update({
    where: { id: postId },
    data: { processedStatus: "processing" },
  });

  try {
    const reports = await prisma.report.findMany({
      where: { postId },
      select: { headline: true, reportDescription: true },
    });

    const categories = await prisma.category.findMany({
      select: { slug: true },
    });
    const categorySlugs = categories.map((c) => c.slug);

    const analysis = await analyzePost({
      sourceUrl: post.sourceUrl,
      userReports: reports,
      categorySlugs,
    });

    const updateData: {
      aiSummary: string;
      aiCredibilityScore: number;
      aiTransparencyNotes: string;
      processedStatus: string;
      thumbnailUrl?: string | null;
      headline?: string | null;
    } = {
      aiSummary: analysis.aiSummary,
      aiCredibilityScore: analysis.aiCredibilityScore,
      aiTransparencyNotes: analysis.aiTransparencyNotes,
      processedStatus: "completed",
    };

    if (analysis.suggestedThumbnailUrl != null) {
      updateData.thumbnailUrl = analysis.suggestedThumbnailUrl;
    }
    if (post.headline == null && reports.length > 0) {
      updateData.headline = reports[0].headline;
    }

    await prisma.post.update({
      where: { id: postId },
      data: updateData,
    });

    if (analysis.categories.length > 0) {
      const categoryMap = await prisma.category.findMany({
        where: { slug: { in: analysis.categories.map((c) => c.slug) } },
        select: { id: true, slug: true },
      });
      const slugToId = new Map(categoryMap.map((c) => [c.slug, c.id]));

      for (const cat of analysis.categories) {
        const categoryId = slugToId.get(cat.slug);
        if (!categoryId) continue;

        await prisma.aiPostCategory.upsert({
          where: {
            postId_categoryId: { postId, categoryId },
          },
          update: { confidence: cat.confidence },
          create: {
            postId,
            categoryId,
            confidence: cat.confidence,
          },
        });
      }
    }
  } catch (error) {
    console.error(`processPost failed for ${postId}:`, error);
    await prisma.post.update({
      where: { id: postId },
      data: { processedStatus: "failed" },
    });
  }
}
