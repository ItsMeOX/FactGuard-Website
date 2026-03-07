import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/validators/auth.validator";
import { changePassword, AuthError } from "@/lib/services/auth.service";
import { getAuthUser } from "@/lib/auth";

export async function PUT(request: Request) {
  let authUser;
  try {
    authUser = await getAuthUser(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    const input = changePasswordSchema.parse(body);
    await changePassword(authUser.id, input);

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "Validation failed", details: (error as { issues: unknown }).issues },
        { status: 400 }
      );
    }
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
