/**
 * E2E: Auth flow — register, login, get profile.
 * Mocks: auth.service (register, login, getProfile), lib/auth (getAuthUser for profile).
 */

const mockRegisterUser = jest.fn();
const mockLoginUser = jest.fn();
const mockGetProfile = jest.fn();
const mockGetAuthUser = jest.fn();

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
  registerUser: (...args: unknown[]) => mockRegisterUser(...args),
  loginUser: (...args: unknown[]) => mockLoginUser(...args),
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  updateProfile: jest.fn(),
  AuthError,
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
}));

import { POST as PostRegister } from "@/app/api/auth/register/route";
import { POST as PostLogin } from "@/app/api/auth/login/route";
import { GET as GetProfile } from "@/app/api/auth/profile/route";

const REGISTER_BODY = {
  email: "e2e-user@example.com",
  password: "password123",
  displayName: "E2E User",
};

const LOGIN_BODY = {
  email: "e2e-user@example.com",
  password: "password123",
};

const AUTH_USER = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: REGISTER_BODY.email,
  displayName: REGISTER_BODY.displayName,
};

const AUTH_RESULT = {
  user: AUTH_USER,
  token: "e2e-jwt-token",
};

const PROFILE_DATA = {
  id: AUTH_USER.id,
  email: AUTH_USER.email,
  displayName: AUTH_USER.displayName,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  reportCount: 0,
};

function makeRegisterRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeLoginRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeProfileRequest(token: string): Request {
  return new Request("http://localhost:3000/api/auth/profile", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUser.mockResolvedValue(AUTH_USER);
});

describe("e2e: auth flow (register, login, get profile)", () => {
  it("returns 201 with user and token when registering with valid input", async () => {
    mockRegisterUser.mockResolvedValue(AUTH_RESULT);

    const response = await PostRegister(makeRegisterRequest(REGISTER_BODY));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.id).toBe(AUTH_USER.id);
    expect(data.user.email).toBe(REGISTER_BODY.email);
    expect(data.user.displayName).toBe(REGISTER_BODY.displayName);
    expect(data.token).toBe(AUTH_RESULT.token);
    expect(mockRegisterUser).toHaveBeenCalledWith({
      email: REGISTER_BODY.email,
      password: REGISTER_BODY.password,
      displayName: REGISTER_BODY.displayName,
    });
  });

  it("returns 200 with user and token when logging in with valid credentials", async () => {
    mockLoginUser.mockResolvedValue(AUTH_RESULT);

    const response = await PostLogin(makeLoginRequest(LOGIN_BODY));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.email).toBe(LOGIN_BODY.email);
    expect(data.token).toBe(AUTH_RESULT.token);
    expect(mockLoginUser).toHaveBeenCalledWith({
      email: LOGIN_BODY.email,
      password: LOGIN_BODY.password,
    });
  });

  it("returns 200 with user profile when requesting profile with valid token", async () => {
    mockGetProfile.mockResolvedValue(PROFILE_DATA);

    const response = await GetProfile(makeProfileRequest(AUTH_RESULT.token));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe(PROFILE_DATA.id);
    expect(data.user.email).toBe(PROFILE_DATA.email);
    expect(data.user.displayName).toBe(PROFILE_DATA.displayName);
    expect(data.user.reportCount).toBe(0);
    expect(data.user.createdAt).toBeDefined();
    expect(mockGetProfile).toHaveBeenCalledWith(AUTH_USER.id);
  });

  it("full flow: register then get profile with returned token returns profile", async () => {
    mockRegisterUser.mockResolvedValue(AUTH_RESULT);
    mockGetProfile.mockResolvedValue(PROFILE_DATA);

    const registerResponse = await PostRegister(makeRegisterRequest(REGISTER_BODY));
    const registerData = await registerResponse.json();

    expect(registerResponse.status).toBe(201);
    expect(registerData.token).toBeDefined();

    const profileResponse = await GetProfile(
      makeProfileRequest(registerData.token)
    );
    const profileData = await profileResponse.json();

    expect(profileResponse.status).toBe(200);
    expect(profileData.user.email).toBe(REGISTER_BODY.email);
    expect(profileData.user.displayName).toBe(REGISTER_BODY.displayName);
    expect(mockGetProfile).toHaveBeenCalledWith(AUTH_USER.id);
  });

  it("returns 401 when get profile is called without auth header", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("Missing authorization"));

    const request = new Request("http://localhost:3000/api/auth/profile", {
      method: "GET",
    });

    const response = await GetProfile(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it("returns 400 when register body fails validation", async () => {
    const invalidBody = { email: "not-an-email", password: "short" };

    const response = await PostRegister(makeRegisterRequest(invalidBody));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  it("returns 401 when login credentials are invalid", async () => {
    mockLoginUser.mockRejectedValue(
      new AuthError("Invalid email or password", 401)
    );

    const response = await PostLogin(
      makeLoginRequest({ email: "e2e-user@example.com", password: "wrongpass" })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid email or password");
  });

  it("returns 409 when registering with already used email", async () => {
    mockRegisterUser.mockRejectedValue(
      new AuthError("Email already registered", 409)
    );

    const response = await PostRegister(makeRegisterRequest(REGISTER_BODY));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Email already registered");
  });
});
