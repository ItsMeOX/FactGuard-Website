const mockGetPostById = jest.fn();

jest.mock("@/lib/services/post.service", () => ({
  getPostById: (...args: unknown[]) => mockGetPostById(...args),
  getPostRanking: jest.fn(),
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

import { GET } from "@/app/api/posts/[id]/route";

const POST_ID = "550e8400-e29b-41d4-a716-446655440000";

const mockDetail = {
  post: {
    id: POST_ID,
    sourceUrl: "https://example.com/article",
    sourceType: "WEBPAGE",
    headline: "Test headline",
    thumbnailUrl: "https://example.com/thumb.jpg",
    aiSummary: "Summary",
    aiCredibilityScore: 65,
    aiTransparencyNotes: "Notes",
    reportCount: 2,
    createdAt: "2026-01-01T12:00:00Z",
    categories: [{ slug: "health", name: "Health", confidence: 0.9 }],
  },
  reports: [
    {
      id: "report-1",
      headline: "Report 1",
      platform: "Facebook",
      reportDescription: "Desc 1",
      supportingEvidence: "Evidence 1",
      status: "pending",
      createdAt: "2026-01-02T10:00:00Z",
    },
  ],
  comments: [
    {
      id: "comment-1",
      userId: "user-1",
      userName: "Alice",
      content: '{"type":"report","reportId":"report-1","headline":"Report 1"}',
      createdAt: "2026-01-02T10:00:00Z",
      parentCommentId: null,
      replies: [],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

function makeGetRequest(id: string): Request {
  return new Request(`http://localhost/api/posts/${id}`, { method: "GET" });
}

describe("GET /api/posts/[id]", () => {
  it("returns 200 with post detail when post exists", async () => {
    mockGetPostById.mockResolvedValue(mockDetail);

    const response = await GET(
      makeGetRequest(POST_ID),
      { params: Promise.resolve({ id: POST_ID }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.post.id).toBe(POST_ID);
    expect(data.post.headline).toBe("Test headline");
    expect(data.reports).toHaveLength(1);
    expect(data.comments).toHaveLength(1);
    expect(mockGetPostById).toHaveBeenCalledWith(POST_ID);
  });

  it("returns 404 when post does not exist", async () => {
    mockGetPostById.mockResolvedValue(null);

    const response = await GET(
      makeGetRequest(POST_ID),
      { params: Promise.resolve({ id: POST_ID }) }
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Post not found");
  });

  it("returns 500 when service throws unexpected error", async () => {
    mockGetPostById.mockRejectedValue(new Error("DB error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await GET(
      makeGetRequest(POST_ID),
      { params: Promise.resolve({ id: POST_ID }) }
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });
});
