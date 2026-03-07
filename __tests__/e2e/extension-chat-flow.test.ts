/**
 * E2E: Extension chat report flow — submit chat report then list posts.
 * Mocks: auth, extension-report service, processPost, post service.
 */

const mockGetAuthUser = jest.fn();
const mockCreateExtensionChatReport = jest.fn();
const mockProcessPost = jest.fn();
const mockGetPostRanking = jest.fn();

class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

jest.mock("@/lib/auth", () => ({
  getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
}));

jest.mock("@/lib/services/auth.service", () => ({
  AuthError,
}));

jest.mock("@/lib/services/extension-report.service", () => ({
  createExtensionChatReport: (...args: unknown[]) =>
    mockCreateExtensionChatReport(...args),
  ReportError: class ReportError extends Error {
    constructor(
      message: string,
      public statusCode: number
    ) {
      super(message);
      this.name = "ReportError";
    }
  },
}));

jest.mock("@/lib/services/post-processing.service", () => ({
  processPost: (...args: unknown[]) => mockProcessPost(...args),
}));

jest.mock("@/lib/services/post.service", () => ({
  getPostRanking: (...args: unknown[]) => mockGetPostRanking(...args),
  PostServiceError: class PostServiceError extends Error {
    constructor(
      message: string,
      public statusCode: number
    ) {
      super(message);
      this.name = "PostServiceError";
    }
  },
}));

import { POST as PostExtensionChatReport } from "@/app/api/internal/extension/chat-report/route";
import { GET as GetPosts } from "@/app/api/posts/route";
import { processPost } from "@/lib/services/post-processing.service";

const AUTH_USER = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "extension-user@example.com",
  displayName: "E2E Extension User",
};

const CHAT_REPORT_BODY = {
  headline: "Unverified health claims in WhatsApp group",
  platform: "whatsapp",
  messages: [
    { sender: "User A", text: "This supplement cures cancer" },
    { sender: "User B", text: "Where did you hear that?" },
  ],
  reportDescription: "The chat contains unverified medical claims.",
  supportingEvidence: "No peer-reviewed sources cited.",
};

const POST_ID = "post-chat-e2e-001";

const PROCESSED_CHAT_POST = {
  id: POST_ID,
  headline: CHAT_REPORT_BODY.headline,
  sourceType: "WHATSAPP_CHAT",
  thumbnailUrl: "/platform-logos/whatsapp.png",
  reportCount: 1,
  commentCount: 1,
  latestReportAt: new Date("2026-03-07T12:00:00Z"),
};

function makeChatReportRequest(body: unknown): Request {
  return new Request(
    "http://localhost:3000/api/internal/extension/chat-report",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer e2e-extension-token",
      },
      body: JSON.stringify(body),
    }
  );
}

function makeGetPostsRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/posts");
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  );
  return new Request(url.toString(), { method: "GET" });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUser.mockResolvedValue(AUTH_USER);
});

describe("e2e: extension chat report flow", () => {
  it("returns 201 with report and postId when user submits chat report for new conversation", async () => {
    mockCreateExtensionChatReport.mockResolvedValue({
      report: {
        id: "report-chat-e2e-1",
        headline: CHAT_REPORT_BODY.headline,
        reportDescription: CHAT_REPORT_BODY.reportDescription,
        supportingEvidence: CHAT_REPORT_BODY.supportingEvidence,
        platform: CHAT_REPORT_BODY.platform,
        status: "pending",
        createdAt: new Date("2026-03-07T12:00:00Z"),
      },
      postReportCount: 1,
      postId: POST_ID,
    });

    const response = await PostExtensionChatReport(
      makeChatReportRequest(CHAT_REPORT_BODY)
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.report).toBeDefined();
    expect(data.report.id).toBe("report-chat-e2e-1");
    expect(data.postReportCount).toBe(1);
    expect(data.postId).toBe(POST_ID);
    expect(mockCreateExtensionChatReport).toHaveBeenCalledWith(
      AUTH_USER.id,
      CHAT_REPORT_BODY
    );
  });

  it("full flow: submit chat report then process post then list returns chat post with platform thumbnail", async () => {
    mockCreateExtensionChatReport.mockResolvedValue({
      report: {
        id: "report-chat-e2e-full",
        headline: CHAT_REPORT_BODY.headline,
        reportDescription: CHAT_REPORT_BODY.reportDescription,
        supportingEvidence: CHAT_REPORT_BODY.supportingEvidence,
        platform: CHAT_REPORT_BODY.platform,
        status: "pending",
        createdAt: new Date("2026-03-07T12:00:00Z"),
      },
      postReportCount: 1,
      postId: POST_ID,
    });

    const reportResponse = await PostExtensionChatReport(
      makeChatReportRequest(CHAT_REPORT_BODY)
    );
    const reportData = await reportResponse.json();

    expect(reportResponse.status).toBe(201);
    expect(reportData.postId).toBe(POST_ID);

    mockProcessPost.mockResolvedValue(undefined);
    await processPost(reportData.postId);

    expect(mockProcessPost).toHaveBeenCalledWith(POST_ID);

    mockGetPostRanking.mockResolvedValue({
      posts: [PROCESSED_CHAT_POST],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    });

    const listResponse = await GetPosts(makeGetPostsRequest());
    const listData = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listData.posts).toHaveLength(1);
    expect(listData.posts[0].id).toBe(POST_ID);
    expect(listData.posts[0].headline).toBe(CHAT_REPORT_BODY.headline);
    expect(listData.posts[0].sourceType).toBe("WHATSAPP_CHAT");
    expect(listData.posts[0].thumbnailUrl).toBe(
      "/platform-logos/whatsapp.png"
    );
    expect(listData.posts[0].reportCount).toBe(1);
    expect(listData.posts[0].commentCount).toBe(1);
    expect(listData.totalCount).toBe(1);
  });

  it("returns 401 when chat report is submitted without auth", async () => {
    mockGetAuthUser.mockRejectedValue(
      new Error("Missing or invalid authorization header")
    );

    const request = new Request(
      "http://localhost:3000/api/internal/extension/chat-report",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(CHAT_REPORT_BODY),
      }
    );

    const response = await PostExtensionChatReport(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(mockCreateExtensionChatReport).not.toHaveBeenCalled();
  });

  it("returns 400 when chat report body fails validation", async () => {
    const invalidBody = { ...CHAT_REPORT_BODY, messages: [] };

    const response = await PostExtensionChatReport(
      makeChatReportRequest(invalidBody)
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(mockCreateExtensionChatReport).not.toHaveBeenCalled();
  });
});
