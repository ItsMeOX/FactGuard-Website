class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

jest.mock("@/lib/services/auth.service", () => ({
  changePassword: jest.fn(),
  AuthError,
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
}));

import { PUT } from "@/app/api/auth/change-password/route";
import { changePassword } from "@/lib/services/auth.service";
import { getAuthUser } from "@/lib/auth";

const mockChangePassword = changePassword as jest.Mock;
const mockGetAuthUser = getAuthUser as jest.Mock;

const authUser = {
  id: "uuid-1",
  email: "test@example.com",
  displayName: "Test User",
};

const validBody = {
  currentPassword: "oldpass123",
  newPassword: "newpass1234",
  confirmPassword: "newpass1234",
};

function makeRequest(
  body: unknown,
  token = "valid-token"
): Request {
  return new Request("http://localhost:3000/api/auth/change-password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost:3000/api/auth/change-password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: "not json{{{",
  });
}

function makeNoAuthRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/change-password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUser.mockResolvedValue(authUser);
});

describe("PUT /api/auth/change-password", () => {
  it("returns 200 on successful password change", async () => {
    mockChangePassword.mockResolvedValue(undefined);

    const response = await PUT(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Password changed successfully");
  });

  it("returns 401 when no auth header is provided", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Missing or invalid authorization header", 401)
    );

    const response = await PUT(makeNoAuthRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Missing or invalid authorization header");
  });

  it("returns 401 for invalid token", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    const response = await PUT(makeRequest(validBody, "bad-token"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token");
  });

  it("returns 401 when current password is incorrect", async () => {
    mockChangePassword.mockRejectedValue(
      new AuthError("Current password is incorrect", 401)
    );

    const response = await PUT(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Current password is incorrect");
  });

  it("returns 400 when new password is too short", async () => {
    const response = await PUT(
      makeRequest({
        currentPassword: "oldpass123",
        newPassword: "short",
        confirmPassword: "short",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when passwords do not match", async () => {
    const response = await PUT(
      makeRequest({
        currentPassword: "oldpass123",
        newPassword: "newpass1234",
        confirmPassword: "mismatch99",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when new password equals current password", async () => {
    const response = await PUT(
      makeRequest({
        currentPassword: "samepass123",
        newPassword: "samepass123",
        confirmPassword: "samepass123",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for missing fields", async () => {
    const response = await PUT(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await PUT(makeInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 404 when user not found in service", async () => {
    mockChangePassword.mockRejectedValue(
      new AuthError("User not found", 404)
    );

    const response = await PUT(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 500 for unexpected errors", async () => {
    mockChangePassword.mockRejectedValue(new Error("DB crash"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await PUT(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("passes correct userId and input to service", async () => {
    mockChangePassword.mockResolvedValue(undefined);

    await PUT(makeRequest(validBody));

    expect(mockChangePassword).toHaveBeenCalledWith("uuid-1", validBody);
  });
});
