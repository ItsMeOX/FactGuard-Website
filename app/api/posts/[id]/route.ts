import { NextResponse } from "next/server";
import {
  getPostById,
  PostServiceError,
} from "@/lib/services/post.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "Post ID is required" },
      { status: 400 }
    );
  }

  try {
    const detail = await getPostById(id);

    if (detail == null) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(detail, { status: 200 });
  } catch (error) {
    if (error instanceof PostServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Get post detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
