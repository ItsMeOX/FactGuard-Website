import { NextResponse } from "next/server";
import { updateProfileSchema } from "@/lib/validators/auth.validator";
import { getProfile, updateProfile, AuthError } from "@/lib/services/auth.service";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: Request) {
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

  try {
    const profile = await getProfile(authUser.id);

    return NextResponse.json({ user: profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const input = updateProfileSchema.parse(body);
    const user = await updateProfile(authUser.id, input);

    return NextResponse.json({ user });
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
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
