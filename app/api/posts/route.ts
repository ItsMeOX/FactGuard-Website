import { NextResponse } from "next/server";
import { getPostsSchema } from "@/lib/validators/post.validator";
import {
  getPostRanking,
  PostServiceError,
} from "@/lib/services/post.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawParams = {
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    category: searchParams.get("category") ?? undefined,
  };

  const parsed = getPostsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await getPostRanking(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof PostServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Get posts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
