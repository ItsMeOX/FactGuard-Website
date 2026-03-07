import { NextResponse } from "next/server";

export async function GET(_request: Request): Promise<NextResponse> {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
