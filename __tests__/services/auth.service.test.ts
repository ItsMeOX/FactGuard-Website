import bcrypt from "bcrypt";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken,
  AuthError,
} from "@/lib/services/auth.service";

const mockUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "test@example.com",
  passwordHash: "$2b$10$hashedpassword",
  displayName: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;
const mockUpdate = (prisma.user as unknown as { update: jest.Mock }).update;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("registerUser", () => {
  const validInput = {
    email: "new@example.com",
    password: "password123",
    displayName: "New User",
  };

  it("creates a user and returns user data with token", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      ...mockUser,
      email: validInput.email,
      displayName: validInput.displayName,
    });

    const result = await registerUser(validInput);

    expect(result.user.email).toBe(validInput.email);
    expect(result.user.displayName).toBe(validInput.displayName);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
  });

  it("hashes the password before storing", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(mockUser);

    await registerUser(validInput);

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.passwordHash).not.toBe(validInput.password);
    const isHashed = await bcrypt.compare(
      validInput.password,
      createCall.data.passwordHash
    );
    expect(isHashed).toBe(true);
  });

  it("throws 409 if email already exists", async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    await expect(registerUser(validInput)).rejects.toThrow(AuthError);
    await expect(registerUser(validInput)).rejects.toMatchObject({
      message: "Email already registered",
      statusCode: 409,
    });
  });

  it("defaults displayName to email prefix when not provided", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ ...mockUser, displayName: "new" });

    await registerUser({ email: "new@example.com", password: "password123" });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.displayName).toBe("new");
  });

  it("does not call create if email exists", async () => {
    mockFindUnique.mockResolvedValue(mockUser);

    await expect(registerUser(validInput)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("loginUser", () => {
  const validInput = { email: "test@example.com", password: "password123" };

  it("returns user data and token for valid credentials", async () => {
    const hashed = await bcrypt.hash(validInput.password, 10);
    mockFindUnique.mockResolvedValue({ ...mockUser, passwordHash: hashed });

    const result = await loginUser(validInput);

    expect(result.user.email).toBe(validInput.email);
    expect(result.user.id).toBe(mockUser.id);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
  });

  it("throws 401 if user not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(loginUser(validInput)).rejects.toThrow(AuthError);
    await expect(loginUser(validInput)).rejects.toMatchObject({
      message: "Invalid email or password",
      statusCode: 401,
    });
  });

  it("throws 401 if password is wrong", async () => {
    const hashed = await bcrypt.hash("different-password", 10);
    mockFindUnique.mockResolvedValue({ ...mockUser, passwordHash: hashed });

    await expect(loginUser(validInput)).rejects.toThrow(AuthError);
    await expect(loginUser(validInput)).rejects.toMatchObject({
      message: "Invalid email or password",
      statusCode: 401,
    });
  });

  it("does not reveal whether email or password was wrong", async () => {
    mockFindUnique.mockResolvedValue(null);
    try {
      await loginUser(validInput);
    } catch (e) {
      expect((e as AuthError).message).toBe("Invalid email or password");
    }

    const hashed = await bcrypt.hash("wrong", 10);
    mockFindUnique.mockResolvedValue({ ...mockUser, passwordHash: hashed });
    try {
      await loginUser(validInput);
    } catch (e) {
      expect((e as AuthError).message).toBe("Invalid email or password");
    }
  });
});

describe("getProfile", () => {
  it("returns full profile with report count", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockUser,
      _count: { reports: 5 },
    });

    const result = await getProfile(mockUser.id);

    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
    expect(result.displayName).toBe(mockUser.displayName);
    expect(result.createdAt).toBe(mockUser.createdAt);
    expect(result.reportCount).toBe(5);
  });

  it("queries with include _count for reports", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockUser,
      _count: { reports: 0 },
    });

    await getProfile(mockUser.id);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      include: { _count: { select: { reports: true } } },
    });
  });

  it("returns reportCount of 0 for user with no reports", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockUser,
      _count: { reports: 0 },
    });

    const result = await getProfile(mockUser.id);

    expect(result.reportCount).toBe(0);
  });

  it("throws 404 if user does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(getProfile("nonexistent-id")).rejects.toThrow(AuthError);
    await expect(getProfile("nonexistent-id")).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("does not expose passwordHash in the result", async () => {
    mockFindUnique.mockResolvedValue({
      ...mockUser,
      _count: { reports: 0 },
    });

    const result = await getProfile(mockUser.id);

    expect(result).not.toHaveProperty("passwordHash");
  });
});

describe("updateProfile", () => {
  it("updates and returns the user with new display name", async () => {
    mockFindUnique.mockResolvedValue(mockUser);
    mockUpdate.mockResolvedValue({
      ...mockUser,
      displayName: "Updated Name",
    });

    const result = await updateProfile(mockUser.id, {
      displayName: "Updated Name",
    });

    expect(result.displayName).toBe("Updated Name");
    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { displayName: "Updated Name" },
    });
  });

  it("throws 404 if user does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      updateProfile("nonexistent-id", { displayName: "Name" })
    ).rejects.toThrow(AuthError);
    await expect(
      updateProfile("nonexistent-id", { displayName: "Name" })
    ).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("does not call update if user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      updateProfile("nonexistent-id", { displayName: "Name" })
    ).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("changePassword", () => {
  const validInput = {
    currentPassword: "password123",
    newPassword: "newpass1234",
    confirmPassword: "newpass1234",
  };

  it("changes the password when current password is correct", async () => {
    const hashed = await bcrypt.hash(validInput.currentPassword, 10);
    mockFindUnique.mockResolvedValue({ ...mockUser, passwordHash: hashed });
    mockUpdate.mockResolvedValue(mockUser);

    await expect(
      changePassword(mockUser.id, validInput)
    ).resolves.toBeUndefined();

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.where.id).toBe(mockUser.id);
    const isNewHash = await bcrypt.compare(
      validInput.newPassword,
      updateCall.data.passwordHash
    );
    expect(isNewHash).toBe(true);
  });

  it("throws 404 if user does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      changePassword("nonexistent-id", validInput)
    ).rejects.toThrow(AuthError);
    await expect(
      changePassword("nonexistent-id", validInput)
    ).rejects.toMatchObject({
      message: "User not found",
      statusCode: 404,
    });
  });

  it("throws 401 if current password is incorrect", async () => {
    const hashed = await bcrypt.hash("different-password", 10);
    mockFindUnique.mockResolvedValue({ ...mockUser, passwordHash: hashed });

    await expect(
      changePassword(mockUser.id, validInput)
    ).rejects.toThrow(AuthError);
    await expect(
      changePassword(mockUser.id, validInput)
    ).rejects.toMatchObject({
      message: "Current password is incorrect",
      statusCode: 401,
    });
  });

  it("does not call update if current password is wrong", async () => {
    const hashed = await bcrypt.hash("wrong-password", 10);
    mockFindUnique.mockResolvedValue({ ...mockUser, passwordHash: hashed });

    await expect(
      changePassword(mockUser.id, validInput)
    ).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("hashes the new password before storing", async () => {
    const hashed = await bcrypt.hash(validInput.currentPassword, 10);
    mockFindUnique.mockResolvedValue({ ...mockUser, passwordHash: hashed });
    mockUpdate.mockResolvedValue(mockUser);

    await changePassword(mockUser.id, validInput);

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.passwordHash).not.toBe(validInput.newPassword);
  });
});

describe("verifyToken", () => {
  it("returns user payload from a valid token", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(mockUser);

    const { token } = await registerUser({
      email: "verify@example.com",
      password: "password123",
    });

    const payload = await verifyToken(token);

    expect(payload.id).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
  });

  it("throws 401 for an invalid token", async () => {
    await expect(verifyToken("invalid.token.here")).rejects.toThrow(AuthError);
    await expect(verifyToken("invalid.token.here")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("throws 401 for an empty string", async () => {
    await expect(verifyToken("")).rejects.toThrow(AuthError);
  });
});

describe("AuthError", () => {
  it("has correct name, message, and statusCode", () => {
    const error = new AuthError("test message", 418);
    expect(error.name).toBe("AuthError");
    expect(error.message).toBe("test message");
    expect(error.statusCode).toBe(418);
    expect(error).toBeInstanceOf(Error);
  });
});
