class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

class ReportError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ReportError";
  }
}

const mockGetAuthUser = jest.fn();
const mockCreateExtensionChatReport = jest.fn();

jest.mock("@/lib/auth", () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
}));

jest.mock("@/lib/services/auth.service", () => ({
  AuthError,
}));

jest.mock("@/lib/services/extension-report.service", () => ({
  createExtensionChatReport: (...args: unknown[]) =>
    mockCreateExtensionChatReport(...args),
  ReportError,
}));

import { POST } from "@/app/api/internal/extension/chat-report/route";

const AUTH_USER = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "extension-user@example.com",
  displayName: "Extension User",
};

const VALID_BODY = {
  headline: "Unverified health claims in group chat",
  platform: "whatsapp",
  messages: [
    { sender: "User A", text: "This supplement cures cancer" },
    { sender: "User B", text: "Where did you hear that?" },
  ],
  reportDescription: "The chat contains unverified medical claims.",
  supportingEvidence: "No peer-reviewed sources cited.",
};

const SERVICE_RESULT = {
  report: {
    id: "report-uuid-1",
    headline: VALID_BODY.headline,
    reportDescription: VALID_BODY.reportDescription,
    supportingEvidence: VALID_BODY.supportingEvidence,
    platform: VALID_BODY.platform,
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    messages: VALID_BODY.messages,
  },
  postReportCount: 1,
  postId: "post-uuid-1",
};

function makeRequest(body: unknown, token = "valid-token"): Request {
  return new Request(
    "http://localhost:3000/api/internal/extension/chat-report",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
}

function makeNoAuthRequest(body: unknown): Request {
  return new Request(
    "http://localhost:3000/api/internal/extension/chat-report",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function makeInvalidJsonRequest(): Request {
  return new Request(
    "http://localhost:3000/api/internal/extension/chat-report",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: "not json{{{",
    }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUser.mockResolvedValue(AUTH_USER);
});

describe("POST /api/internal/extension/chat-report", () => {
  it("returns 201 with report and postId on success", async () => {
    mockCreateExtensionChatReport.mockResolvedValue(SERVICE_RESULT);

    const response = await POST(makeRequest(VALID_BODY));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.report.id).toBe("report-uuid-1");
    expect(data.report.headline).toBe(VALID_BODY.headline);
    expect(data.report.status).toBe("pending");
    expect(data.postReportCount).toBe(1);
    expect(data.postId).toBe("post-uuid-1");
  });

  it("returns 401 when no auth header is provided", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("Missing auth"));

    const response = await POST(makeNoAuthRequest(VALID_BODY));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 for invalid token", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    const response = await POST(makeRequest(VALID_BODY, "bad-token"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token");
  });

  it("returns 400 when body fails validation", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, messages: [] })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(makeInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 409 when user has already reported this chat", async () => {
    mockCreateExtensionChatReport.mockRejectedValue(
      new ReportError("You have already reported this post", 409)
    );

    const response = await POST(makeRequest(VALID_BODY));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("You have already reported this post");
  });

  it("returns 500 for unexpected errors", async () => {
    mockCreateExtensionChatReport.mockRejectedValue(new Error("DB crash"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await POST(makeRequest(VALID_BODY));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("passes correct userId and input to service", async () => {
    mockCreateExtensionChatReport.mockResolvedValue(SERVICE_RESULT);

    await POST(makeRequest(VALID_BODY));

    expect(mockCreateExtensionChatReport).toHaveBeenCalledWith(AUTH_USER.id, VALID_BODY);
  });

  it("does not call createExtensionChatReport if auth fails", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    await POST(makeRequest(VALID_BODY, "bad"));

    expect(mockCreateExtensionChatReport).not.toHaveBeenCalled();
  });

  it("does not call createExtensionChatReport if validation fails", async () => {
    await POST(makeRequest({ ...VALID_BODY, headline: "" }));

    expect(mockCreateExtensionChatReport).not.toHaveBeenCalled();
  });
});
