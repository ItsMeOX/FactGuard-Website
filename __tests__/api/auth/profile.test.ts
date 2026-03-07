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
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  AuthError,
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
}));

import { GET, PATCH } from "@/app/api/auth/profile/route";
import { getProfile, updateProfile } from "@/lib/services/auth.service";
import { getAuthUser } from "@/lib/auth";

const mockGetProfile = getProfile as jest.Mock;
const mockUpdateProfile = updateProfile as jest.Mock;
const mockGetAuthUser = getAuthUser as jest.Mock;

const authUser = {
  id: "uuid-1",
  email: "test@example.com",
  displayName: "Test User",
};

function makeGetRequest(token = "valid-token"): Request {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

function makeGetNoAuthRequest(): Request {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "GET",
  });
}

function makePatchRequest(
  body: unknown,
  token = "valid-token"
): Request {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

function makePatchInvalidJsonRequest(): Request {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: "not json{{{",
  });
}

function makePatchNoAuthRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUser.mockResolvedValue(authUser);
});

describe("GET /api/auth/profile", () => {
  const profileData = {
    id: "uuid-1",
    email: "test@example.com",
    displayName: "Test User",
    createdAt: "2026-01-01T00:00:00.000Z",
    reportCount: 3,
  };

  it("returns 200 with full profile data", async () => {
    mockGetProfile.mockResolvedValue(profileData);

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe("uuid-1");
    expect(data.user.email).toBe("test@example.com");
    expect(data.user.displayName).toBe("Test User");
    expect(data.user.reportCount).toBe(3);
    expect(data.user.createdAt).toBeDefined();
  });

  it("returns 401 when no auth header is provided", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Missing or invalid authorization header", 401)
    );

    const response = await GET(makeGetNoAuthRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Missing or invalid authorization header");
  });

  it("returns 401 for invalid token", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    const response = await GET(makeGetRequest("bad-token"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token");
  });

  it("returns 404 when user not found in service", async () => {
    mockGetProfile.mockRejectedValue(
      new AuthError("User not found", 404)
    );

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 500 for unexpected errors", async () => {
    mockGetProfile.mockRejectedValue(new Error("DB crash"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("passes correct userId to service", async () => {
    mockGetProfile.mockResolvedValue(profileData);

    await GET(makeGetRequest());

    expect(mockGetProfile).toHaveBeenCalledWith("uuid-1");
  });

  it("does not call getProfile if auth fails", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    await GET(makeGetRequest("bad"));

    expect(mockGetProfile).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/auth/profile", () => {
  it("returns 200 with updated user on success", async () => {
    const updatedUser = { ...authUser, displayName: "New Name" };
    mockUpdateProfile.mockResolvedValue(updatedUser);

    const response = await PATCH(makePatchRequest({ displayName: "New Name" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.displayName).toBe("New Name");
  });

  it("returns 401 when no auth header is provided", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Missing or invalid authorization header", 401)
    );

    const response = await PATCH(makePatchNoAuthRequest({ displayName: "Name" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Missing or invalid authorization header");
  });

  it("returns 401 for invalid token", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    const response = await PATCH(
      makePatchRequest({ displayName: "Name" }, "bad-token")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token");
  });

  it("returns 400 for validation errors (empty name)", async () => {
    const response = await PATCH(makePatchRequest({ displayName: "" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for validation errors (missing field)", async () => {
    const response = await PATCH(makePatchRequest({}));

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await PATCH(makePatchInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 404 when user not found in service", async () => {
    mockUpdateProfile.mockRejectedValue(
      new AuthError("User not found", 404)
    );

    const response = await PATCH(makePatchRequest({ displayName: "Name" }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 500 for unexpected errors", async () => {
    mockUpdateProfile.mockRejectedValue(new Error("DB crash"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await PATCH(makePatchRequest({ displayName: "Name" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("passes correct userId and input to service", async () => {
    mockUpdateProfile.mockResolvedValue(authUser);

    await PATCH(makePatchRequest({ displayName: "Updated" }));

    expect(mockUpdateProfile).toHaveBeenCalledWith("uuid-1", {
      displayName: "Updated",
    });
  });
});
