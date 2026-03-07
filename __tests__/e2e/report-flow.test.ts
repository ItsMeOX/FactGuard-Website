/**
 * E2E: Full flow from report submission through processing to post list.
 * Mocks: auth, report service (for route), processPost, post service (for list).
 */

const mockGetAuthUser = jest.fn();
const mockCreateReport = jest.fn();
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

jest.mock("@/lib/services/report.service", () => ({
  createReport: (...args: unknown[]) => mockCreateReport(...args),
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

import { POST as PostReports } from "@/app/api/reports/route";
import { GET as GetPosts } from "@/app/api/posts/route";
import { processPost } from "@/lib/services/post-processing.service";

const AUTH_USER = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "reporter@example.com",
  displayName: "E2E Reporter",
};

const REPORT_BODY = {
  sourceUrl: "https://example.com/e2e-fake-article",
  headline: "E2E fake headline",
  reportDescription: "This is a test report for e2e flow.",
  supportingEvidence: "No external evidence.",
  platform: "Facebook",
};

const POST_ID = "post-e2e-001";

const PROCESSED_POST = {
  id: POST_ID,
  headline: REPORT_BODY.headline,
  sourceType: "WEBPAGE",
  thumbnailUrl: "https://example.com/og.jpg",
  reportCount: 1,
  commentCount: 1,
  latestReportAt: new Date("2026-03-07T12:00:00Z"),
};

function makeReportRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer e2e-test-token",
    },
    body: JSON.stringify(body),
  });
}

function makeGetPostsRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/posts");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return new Request(url.toString(), { method: "GET" });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUser.mockResolvedValue(AUTH_USER);
});

describe("e2e: report submission to processed post flow", () => {
  it("returns 201 with report and postId when user submits report for new URL", async () => {
    mockCreateReport.mockResolvedValue({
      report: {
        id: "report-e2e-1",
        headline: REPORT_BODY.headline,
        reportDescription: REPORT_BODY.reportDescription,
        supportingEvidence: REPORT_BODY.supportingEvidence,
        platform: REPORT_BODY.platform,
        status: "pending",
        createdAt: new Date("2026-03-07T12:00:00Z"),
      },
      postReportCount: 1,
      postId: POST_ID,
    });

    const response = await PostReports(makeReportRequest(REPORT_BODY));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.report).toBeDefined();
    expect(data.report.id).toBe("report-e2e-1");
    expect(data.postReportCount).toBe(1);
    expect(data.postId).toBe(POST_ID);
    expect(mockCreateReport).toHaveBeenCalledWith(AUTH_USER.id, REPORT_BODY);
  });

  it("does not return postId when report is for existing post", async () => {
    mockCreateReport.mockResolvedValue({
      report: {
        id: "report-e2e-2",
        headline: REPORT_BODY.headline,
        reportDescription: REPORT_BODY.reportDescription,
        supportingEvidence: REPORT_BODY.supportingEvidence,
        platform: REPORT_BODY.platform,
        status: "pending",
        createdAt: new Date("2026-03-07T12:00:00Z"),
      },
      postReportCount: 2,
    });

    const response = await PostReports(makeReportRequest(REPORT_BODY));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.postId).toBeUndefined();
    expect(data.postReportCount).toBe(2);
  });

  it("full flow: submit report then process post then list returns processed post", async () => {
    mockCreateReport.mockResolvedValue({
      report: {
        id: "report-e2e-full",
        headline: REPORT_BODY.headline,
        reportDescription: REPORT_BODY.reportDescription,
        supportingEvidence: REPORT_BODY.supportingEvidence,
        platform: REPORT_BODY.platform,
        status: "pending",
        createdAt: new Date("2026-03-07T12:00:00Z"),
      },
      postReportCount: 1,
      postId: POST_ID,
    });

    const reportResponse = await PostReports(makeReportRequest(REPORT_BODY));
    const reportData = await reportResponse.json();

    expect(reportResponse.status).toBe(201);
    expect(reportData.postId).toBe(POST_ID);

    mockProcessPost.mockResolvedValue(undefined);
    await processPost(reportData.postId);

    expect(mockProcessPost).toHaveBeenCalledWith(POST_ID);

    mockGetPostRanking.mockResolvedValue({
      posts: [PROCESSED_POST],
      totalCount: 1,
      page: 1,
      totalPages: 1,
    });

    const listResponse = await GetPosts(makeGetPostsRequest());
    const listData = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listData.posts).toHaveLength(1);
    expect(listData.posts[0].id).toBe(POST_ID);
    expect(listData.posts[0].headline).toBe(REPORT_BODY.headline);
    expect(listData.posts[0].reportCount).toBe(1);
    expect(listData.posts[0].commentCount).toBe(1);
    expect(listData.totalCount).toBe(1);
    expect(listData.page).toBe(1);
    expect(listData.totalPages).toBe(1);
  });

  it("returns 401 when report is submitted without auth", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("Missing or invalid authorization header"));

    const request = new Request("http://localhost:3000/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(REPORT_BODY),
    });

    const response = await PostReports(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(mockCreateReport).not.toHaveBeenCalled();
  });

  it("returns 400 when report body fails validation", async () => {
    const invalidBody = { ...REPORT_BODY, sourceUrl: "not-a-valid-url" };

    const response = await PostReports(makeReportRequest(invalidBody));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
    expect(mockCreateReport).not.toHaveBeenCalled();
  });
});
