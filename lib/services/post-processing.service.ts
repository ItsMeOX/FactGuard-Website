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
      select: { name: true, slug: true, description: true },
    });

    const analysis = await analyzePost({
      sourceUrl: post.sourceUrl,
      userReports: reports,
      categories,
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
    // Set headline only when the post has none yet (first report). Later reports must not overwrite it.
    const postHasNoHeadline = post.headline == null || post.headline.trim() === "";
    if (postHasNoHeadline) {
      if (analysis.aiHeadline) {
        updateData.headline = analysis.aiHeadline;
      } else if (reports.length > 0) {
        updateData.headline = reports[0].headline;
      }
    }

    await prisma.post.update({
      where: { id: postId },
      data: updateData,
    });

    // Exactly one category per post: replace any existing AI category assignment
    if (analysis.categories.length > 0) {
      const single = analysis.categories[0];
      const categoryRow = await prisma.category.findUnique({
        where: { slug: single.slug },
        select: { id: true },
      });
      if (categoryRow) {
        await prisma.aiPostCategory.deleteMany({ where: { postId } });
        await prisma.aiPostCategory.upsert({
          where: {
            postId_categoryId: { postId, categoryId: categoryRow.id },
          },
          update: { confidence: single.confidence },
          create: {
            postId,
            categoryId: categoryRow.id,
            confidence: single.confidence,
          },
        });
      }
    } else {
      await prisma.aiPostCategory.deleteMany({ where: { postId } });
    }
  } catch (error) {
    console.error(`processPost failed for ${postId}:`, error);
    await prisma.post.update({
      where: { id: postId },
      data: { processedStatus: "failed" },
    });
  }
}
