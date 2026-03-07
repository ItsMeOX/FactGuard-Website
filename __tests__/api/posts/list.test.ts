const mockGetPostRanking = jest.fn();

jest.mock("@/lib/services/post.service", () => ({
  getPostRanking: (...args: unknown[]) => mockGetPostRanking(...args),
  PostServiceError: class PostServiceError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = "PostServiceError";
      this.statusCode = statusCode;
    }
  },
}));

import { GET } from "@/app/api/posts/route";
import { PostServiceError } from "@/lib/services/post.service";

beforeEach(() => {
  jest.clearAllMocks();
});

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/posts");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

const mockPostData = {
  posts: [
    {
      id: "post-uuid-1",
      headline: "Test headline",
      sourceType: "WEBPAGE",
      thumbnailUrl: "https://example.com/thumb.jpg",
      aiSummary: "AI summary of the claim.",
      reportCount: 10,
      commentCount: 0,
      latestReportAt: new Date("2026-03-05T12:00:00Z"),
    },
  ],
  totalCount: 25,
  page: 1,
  totalPages: 3,
};

describe("GET /api/posts", () => {
  it("returns 200 with posts, totalCount, page, and totalPages", async () => {
    mockGetPostRanking.mockResolvedValue(mockPostData);

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].sourceType).toBe("WEBPAGE");
    expect(data.totalCount).toBe(25);
    expect(data.page).toBe(1);
    expect(data.totalPages).toBe(3);
  });

  it("passes category param to service", async () => {
    mockGetPostRanking.mockResolvedValue({
      posts: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
    });

    await GET(makeGetRequest({ category: "health-medicine" }));

    expect(mockGetPostRanking).toHaveBeenCalledWith(
      expect.objectContaining({ category: "health-medicine" })
    );
  });

  it("passes undefined category and returns all posts with pagination when no category query param is provided", async () => {
    mockGetPostRanking.mockResolvedValue({
      posts: [
        {
          id: "post-uuid-1",
          headline: "First by reports",
          sourceType: "WEBPAGE",
          thumbnailUrl: null,
          aiSummary: "Summary one.",
          reportCount: 15,
          commentCount: 3,
          latestReportAt: new Date("2026-03-05T12:00:00Z"),
        },
        {
          id: "post-uuid-2",
          headline: "Second by reports",
          sourceType: "WEBPAGE",
          thumbnailUrl: null,
          aiSummary: null,
          reportCount: 8,
          commentCount: 1,
          latestReportAt: new Date("2026-03-04T10:00:00Z"),
        },
      ],
      totalCount: 50,
      page: 1,
      totalPages: 5,
    });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(2);
    expect(data.totalCount).toBe(50);
    expect(data.page).toBe(1);
    expect(data.totalPages).toBe(5);
    expect(mockGetPostRanking).toHaveBeenCalledTimes(1);
    expect(mockGetPostRanking.mock.calls[0][0].category).toBeUndefined();
  });

  it("passes limit and page params to service", async () => {
    mockGetPostRanking.mockResolvedValue({
      posts: [],
      totalCount: 0,
      page: 2,
      totalPages: 0,
    });

    await GET(makeGetRequest({ limit: "25", page: "2" }));

    expect(mockGetPostRanking).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25, page: 2 })
    );
  });

  it("uses default page 1 and limit 10 when not specified", async () => {
    mockGetPostRanking.mockResolvedValue({
      posts: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
    });

    await GET(makeGetRequest());

    expect(mockGetPostRanking).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 })
    );
  });

  it("returns 400 for invalid limit value", async () => {
    const response = await GET(makeGetRequest({ limit: "0" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("returns 400 for invalid page value", async () => {
    const response = await GET(makeGetRequest({ page: "0" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for limit exceeding max", async () => {
    const response = await GET(makeGetRequest({ limit: "100" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 when service throws PostServiceError", async () => {
    mockGetPostRanking.mockRejectedValue(
      new PostServiceError("Invalid request", 400)
    );

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("returns 500 for unexpected errors", async () => {
    mockGetPostRanking.mockRejectedValue(new Error("Database connection lost"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("returns 200 with empty posts and zero totalCount when no posts exist", async () => {
    mockGetPostRanking.mockResolvedValue({
      posts: [],
      totalCount: 0,
      page: 1,
      totalPages: 0,
    });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toEqual([]);
    expect(data.totalCount).toBe(0);
    expect(data.totalPages).toBe(0);
  });
});
