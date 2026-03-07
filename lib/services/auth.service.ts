import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { AuthUser, AuthResult, UserProfile } from "@/lib/types/auth";
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from "@/lib/validators/auth.validator";

const SALT_ROUNDS = 10;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);
const JWT_ISSUER = "hackomania";
const JWT_EXPIRATION = "7d";

export type { AuthUser, AuthResult, UserProfile } from "@/lib/types/auth";

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new AuthError("Email already registered", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      displayName: input.displayName ?? input.email.split("@")[0],
    },
  });

  const token = await generateToken(user);

  return {
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token,
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthError("Invalid email or password", 401);
  }

  const token = await generateToken(user);

  return {
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token,
  };
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { reports: true } } },
  });
  if (!user) {
    throw new AuthError("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    reportCount: user._count.reports,
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthError("User not found", 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { displayName: input.displayName },
  });

  return {
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
  };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthError("User not found", 404);
  }

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new AuthError("Current password is incorrect", 401);
  }

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function verifyToken(token: string): Promise<AuthUser> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });
    return payload as unknown as AuthUser;
  } catch {
    throw new AuthError("Invalid or expired token", 401);
  }
}

async function generateToken(user: {
  id: string;
  email: string;
  displayName: string | null;
}): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
