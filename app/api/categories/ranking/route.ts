import { NextResponse } from "next/server";
import { getCategoryRankingSchema } from "@/lib/validators/category.validator";
import { getCategoryRanking } from "@/lib/services/category-ranking.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawParams = {
    limit: searchParams.get("limit") ?? undefined,
  };

  const parsed = getCategoryRankingSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await getCategoryRanking(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get category ranking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
