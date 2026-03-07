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

jest.mock("@/lib/services/report.service", () => ({
  createReport: jest.fn(),
  ReportError,
}));

jest.mock("@/lib/services/auth.service", () => ({
  AuthError,
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
}));

import { POST } from "@/app/api/reports/route";
import { createReport } from "@/lib/services/report.service";
import { getAuthUser } from "@/lib/auth";

const mockCreateReport = createReport as jest.Mock;
const mockGetAuthUser = getAuthUser as jest.Mock;

const authUser = {
  id: "uuid-1",
  email: "test@example.com",
  displayName: "Test User",
};

const validBody = {
  sourceUrl: "https://example.com/article",
  headline: "Misleading health claim",
  reportDescription: "This article contains false statements.",
  supportingEvidence: "CDC data contradicts the claims.",
  platform: "Facebook",
};

const serviceResult = {
  report: {
    id: "report-uuid-1",
    headline: validBody.headline,
    reportDescription: validBody.reportDescription,
    supportingEvidence: validBody.supportingEvidence,
    platform: validBody.platform,
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  postReportCount: 3,
};

function makeRequest(body: unknown, token = "valid-token"): Request {
  return new Request("http://localhost:3000/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost:3000/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: "not json{{{",
  });
}

function makeNoAuthRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUser.mockResolvedValue(authUser);
});

describe("POST /api/reports", () => {
  it("returns 201 with report and postReportCount on success", async () => {
    mockCreateReport.mockResolvedValue(serviceResult);

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.report.id).toBe("report-uuid-1");
    expect(data.report.headline).toBe(validBody.headline);
    expect(data.report.status).toBe("pending");
    expect(data.postReportCount).toBe(3);
  });

  it("returns 401 when no auth header is provided", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Missing or invalid authorization header", 401)
    );

    const response = await POST(makeNoAuthRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Missing or invalid authorization header");
  });

  it("returns 401 for invalid token", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    const response = await POST(makeRequest(validBody, "bad-token"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token");
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(makeInvalidJsonRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 for validation errors (missing sourceUrl)", async () => {
    const { sourceUrl: _, ...body } = validBody;
    const response = await POST(makeRequest(body));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for validation errors (invalid URL)", async () => {
    const response = await POST(makeRequest({ ...validBody, sourceUrl: "not-a-url" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 for validation errors (empty headline)", async () => {
    const response = await POST(makeRequest({ ...validBody, headline: "" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for validation errors (missing platform)", async () => {
    const { platform: _, ...body } = validBody;
    const response = await POST(makeRequest(body));

    expect(response.status).toBe(400);
  });

  it("returns 409 when user has already reported the post", async () => {
    mockCreateReport.mockRejectedValue(
      new ReportError("You have already reported this post", 409)
    );

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("You have already reported this post");
  });

  it("returns 500 for unexpected errors", async () => {
    mockCreateReport.mockRejectedValue(new Error("DB crash"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("passes correct userId and input to service", async () => {
    mockCreateReport.mockResolvedValue(serviceResult);

    await POST(makeRequest(validBody));

    expect(mockCreateReport).toHaveBeenCalledWith("uuid-1", validBody);
  });

  it("does not call createReport if auth fails", async () => {
    mockGetAuthUser.mockRejectedValue(
      new AuthError("Invalid or expired token", 401)
    );

    await POST(makeRequest(validBody, "bad"));

    expect(mockCreateReport).not.toHaveBeenCalled();
  });

  it("does not call createReport if JSON parsing fails", async () => {
    await POST(makeInvalidJsonRequest());

    expect(mockCreateReport).not.toHaveBeenCalled();
  });
});
