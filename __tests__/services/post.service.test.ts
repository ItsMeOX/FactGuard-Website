jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getPostRanking,
  encodeCursor,
  decodeCursor,
  PostServiceError,
} from "@/lib/services/post.service";

const mockPostFindMany = prisma.post.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-uuid-1",
    headline: "Test headline",
    sourceType: "WEBPAGE",
    thumbnailUrl: "https://example.com/thumb.jpg",
    reportCount: 5,
    createdAt: new Date("2026-03-01T00:00:00Z"),
    reports: [{ createdAt: new Date("2026-03-05T12:00:00Z") }],
    ...overrides,
  };
}

describe("getPostRanking", () => {
  it("returns posts sorted by reportCount descending", async () => {
    const posts = [
      makePost({ id: "post-1", reportCount: 10 }),
      makePost({ id: "post-2", reportCount: 5 }),
    ];
    mockPostFindMany.mockResolvedValue(posts);

    const result = await getPostRanking({ limit: 10 });

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].id).toBe("post-1");
    expect(result.posts[1].id).toBe("post-2");
  });

  it("returns nextCursor as null when fewer results than limit", async () => {
    mockPostFindMany.mockResolvedValue([makePost()]);

    const result = await getPostRanking({ limit: 10 });

    expect(result.nextCursor).toBeNull();
  });

  it("returns nextCursor when more results than limit", async () => {
    const posts = [
      makePost({ id: "post-1", reportCount: 10 }),
      makePost({ id: "post-2", reportCount: 5 }),
      makePost({ id: "post-3", reportCount: 3 }),
    ];
    mockPostFindMany.mockResolvedValue(posts);

    const result = await getPostRanking({ limit: 2 });

    expect(result.posts).toHaveLength(2);
    expect(result.nextCursor).toBeTruthy();
  });

  it("removes the extra post used for next-page detection", async () => {
    const posts = [
      makePost({ id: "post-1" }),
      makePost({ id: "post-2" }),
      makePost({ id: "post-3" }),
    ];
    mockPostFindMany.mockResolvedValue(posts);

    const result = await getPostRanking({ limit: 2 });

    expect(result.posts).toHaveLength(2);
    expect(result.posts.map((p) => p.id)).toEqual(["post-1", "post-2"]);
  });

  it("fetches limit + 1 rows from the database", async () => {
    mockPostFindMany.mockResolvedValue([]);

    await getPostRanking({ limit: 15 });

    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 16 })
    );
  });

  it("passes category filter when provided", async () => {
    mockPostFindMany.mockResolvedValue([]);

    await getPostRanking({ limit: 10, category: "health-medicine" });

    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          aiPostCategories: {
            some: {
              category: { slug: "health-medicine" },
            },
          },
        }),
      })
    );
  });

  it("does not include category filter when category is not provided", async () => {
    mockPostFindMany.mockResolvedValue([]);

    await getPostRanking({ limit: 10 });

    const callArgs = mockPostFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty("aiPostCategories");
  });

  it("applies cursor-based where clause when cursor is provided", async () => {
    mockPostFindMany.mockResolvedValue([]);
    const cursor = encodeCursor({
      reportCount: 10,
      createdAt: new Date("2026-03-01T00:00:00Z"),
      id: "post-uuid-1",
    });

    await getPostRanking({ limit: 10, cursor });

    const callArgs = mockPostFindMany.mock.calls[0][0];
    expect(callArgs.where).toHaveProperty("OR");
    expect(callArgs.where.OR).toHaveLength(3);
  });

  it("returns empty posts array when no posts exist", async () => {
    mockPostFindMany.mockResolvedValue([]);

    const result = await getPostRanking({ limit: 10 });

    expect(result.posts).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("maps latestReportAt from the most recent report", async () => {
    const reportDate = new Date("2026-03-05T12:00:00Z");
    mockPostFindMany.mockResolvedValue([
      makePost({ reports: [{ createdAt: reportDate }] }),
    ]);

    const result = await getPostRanking({ limit: 10 });

    expect(result.posts[0].latestReportAt).toEqual(reportDate);
  });

  it("returns null latestReportAt when post has no reports", async () => {
    mockPostFindMany.mockResolvedValue([makePost({ reports: [] })]);

    const result = await getPostRanking({ limit: 10 });

    expect(result.posts[0].latestReportAt).toBeNull();
  });

  it("orders by reportCount desc, createdAt desc, id desc", async () => {
    mockPostFindMany.mockResolvedValue([]);

    await getPostRanking({ limit: 10 });

    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { reportCount: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
      })
    );
  });

  it("selects only required fields for the response", async () => {
    mockPostFindMany.mockResolvedValue([]);

    await getPostRanking({ limit: 10 });

    const selectArg = mockPostFindMany.mock.calls[0][0].select;
    expect(selectArg).toHaveProperty("id");
    expect(selectArg).toHaveProperty("headline");
    expect(selectArg).toHaveProperty("sourceType");
    expect(selectArg).toHaveProperty("thumbnailUrl");
    expect(selectArg).toHaveProperty("reportCount");
    expect(selectArg).toHaveProperty("reports");
    expect(selectArg).not.toHaveProperty("scrapedContent");
    expect(selectArg).not.toHaveProperty("aiSummary");
  });
});

describe("encodeCursor / decodeCursor", () => {
  it("roundtrips cursor encoding and decoding", () => {
    const input = {
      reportCount: 42,
      createdAt: new Date("2026-03-01T00:00:00Z"),
      id: "post-uuid-1",
    };

    const encoded = encodeCursor(input);
    const decoded = decodeCursor(encoded);

    expect(decoded.reportCount).toBe(42);
    expect(decoded.createdAt).toBe("2026-03-01T00:00:00.000Z");
    expect(decoded.id).toBe("post-uuid-1");
  });

  it("produces a base64url string", () => {
    const encoded = encodeCursor({
      reportCount: 1,
      createdAt: new Date(),
      id: "test",
    });

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("throws PostServiceError for invalid cursor string", () => {
    expect(() => decodeCursor("not-valid-base64-json")).toThrow(
      PostServiceError
    );
  });

  it("throws PostServiceError for cursor with missing fields", () => {
    const incomplete = Buffer.from(
      JSON.stringify({ reportCount: 1 })
    ).toString("base64url");

    expect(() => decodeCursor(incomplete)).toThrow(PostServiceError);
  });
});

describe("PostServiceError", () => {
  it("has correct name, message, and statusCode", () => {
    const error = new PostServiceError("test error", 400);

    expect(error.name).toBe("PostServiceError");
    expect(error.message).toBe("test error");
    expect(error.statusCode).toBe(400);
    expect(error).toBeInstanceOf(Error);
  });
});
