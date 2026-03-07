import { verifyToken, AuthError } from "@/lib/services/auth.service";
import type { AuthUser } from "@/lib/services/auth.service";

export async function getAuthUser(request: Request): Promise<AuthUser> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header", 401);
  }

  const token = header.slice(7);
  return verifyToken(token);
}
