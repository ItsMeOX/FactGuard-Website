import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processPost } from "@/lib/services/post-processing.service";

const STUCK_THRESHOLD_MS = 2 * 60 * 1000;

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

  const pendingPosts = await prisma.post.findMany({
    where: {
      processedStatus: "pending",
      createdAt: { lt: cutoff },
    },
    select: { id: true },
    take: 10,
  });

  let processed = 0;
  for (const post of pendingPosts) {
    try {
      await processPost(post.id);
      processed++;
    } catch (error) {
      console.error(`Cron: failed to process post ${post.id}:`, error);
    }
  }

  return NextResponse.json({
    processed,
    total: pendingPosts.length,
  });
}
