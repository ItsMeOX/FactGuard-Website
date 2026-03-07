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
      reportCount: 10,
      latestReportAt: new Date("2026-03-05T12:00:00Z"),
    },
  ],
  nextCursor: null,
};

describe("GET /api/posts", () => {
  it("returns 200 with posts and nextCursor", async () => {
    mockGetPostRanking.mockResolvedValue(mockPostData);

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0].sourceType).toBe("WEBPAGE");
    expect(data.nextCursor).toBeNull();
  });

  it("passes category param to service", async () => {
    mockGetPostRanking.mockResolvedValue({ posts: [], nextCursor: null });

    await GET(makeGetRequest({ category: "health-medicine" }));

    expect(mockGetPostRanking).toHaveBeenCalledWith(
      expect.objectContaining({ category: "health-medicine" })
    );
  });

  it("passes limit param to service", async () => {
    mockGetPostRanking.mockResolvedValue({ posts: [], nextCursor: null });

    await GET(makeGetRequest({ limit: "25" }));

    expect(mockGetPostRanking).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 })
    );
  });

  it("passes cursor param to service", async () => {
    mockGetPostRanking.mockResolvedValue({ posts: [], nextCursor: null });

    await GET(makeGetRequest({ cursor: "abc123" }));

    expect(mockGetPostRanking).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: "abc123" })
    );
  });

  it("uses default limit of 10 when not specified", async () => {
    mockGetPostRanking.mockResolvedValue({ posts: [], nextCursor: null });

    await GET(makeGetRequest());

    expect(mockGetPostRanking).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it("returns 400 for invalid limit value", async () => {
    const response = await GET(makeGetRequest({ limit: "0" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("returns 400 for limit exceeding max", async () => {
    const response = await GET(makeGetRequest({ limit: "100" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 when service throws PostServiceError", async () => {
    mockGetPostRanking.mockRejectedValue(
      new PostServiceError("Invalid cursor", 400)
    );

    const response = await GET(makeGetRequest({ cursor: "bad-cursor" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid cursor");
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

  it("returns 200 with empty posts array when no posts exist", async () => {
    mockGetPostRanking.mockResolvedValue({ posts: [], nextCursor: null });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toEqual([]);
  });

  it("returns nextCursor when more pages are available", async () => {
    mockGetPostRanking.mockResolvedValue({
      posts: [mockPostData.posts[0]],
      nextCursor: "eyJyZXBvcnRDb3VudCI6MTB9",
    });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.nextCursor).toBe("eyJyZXBvcnRDb3VudCI6MTB9");
  });
});
