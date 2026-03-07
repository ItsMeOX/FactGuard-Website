import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "@/lib/validators/auth.validator";

describe("registerSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      displayName: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input without optional displayName", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = registerSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password longer than 72 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it("accepts password of exactly 8 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("accepts password of exactly 72 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(72),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty displayName when provided", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      displayName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects displayName longer than 100 characters", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      displayName: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = registerSchema.safeParse({
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts any non-empty password (no min length for login)", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts a valid display name", () => {
    const result = updateProfileSchema.safeParse({ displayName: "New Name" });
    expect(result.success).toBe(true);
  });

  it("rejects empty display name", () => {
    const result = updateProfileSchema.safeParse({ displayName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects display name over 100 characters", () => {
    const result = updateProfileSchema.safeParse({
      displayName: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts display name of exactly 100 characters", () => {
    const result = updateProfileSchema.safeParse({
      displayName: "a".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing display name", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const validInput = {
    currentPassword: "oldpass123",
    newPassword: "newpass123",
    confirmPassword: "newpass123",
  };

  it("accepts valid input", () => {
    const result = changePasswordSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects when new password is too short", () => {
    const result = changePasswordSchema.safeParse({
      ...validInput,
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when new password is too long", () => {
    const long = "a".repeat(73);
    const result = changePasswordSchema.safeParse({
      ...validInput,
      newPassword: long,
      confirmPassword: long,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when confirm password does not match", () => {
    const result = changePasswordSchema.safeParse({
      ...validInput,
      confirmPassword: "mismatch123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when new password equals current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "samepass123",
      newPassword: "samepass123",
      confirmPassword: "samepass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty current password", () => {
    const result = changePasswordSchema.safeParse({
      ...validInput,
      currentPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = changePasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
