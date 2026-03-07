jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getPostRanking, PostServiceError } from "@/lib/services/post.service";

const mockPostFindMany = prisma.post.findMany as jest.Mock;
const mockPostCount = prisma.post.count as jest.Mock;

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
    mockPostCount.mockResolvedValue(2);

    const result = await getPostRanking({ limit: 10, page: 1 });

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].id).toBe("post-1");
    expect(result.posts[1].id).toBe("post-2");
  });

  it("returns totalCount, page, and totalPages", async () => {
    mockPostFindMany.mockResolvedValue([makePost()]);
    mockPostCount.mockResolvedValue(25);

    const result = await getPostRanking({ limit: 10, page: 1 });

    expect(result.totalCount).toBe(25);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
  });

  it("calculates totalPages correctly for exact division", async () => {
    mockPostFindMany.mockResolvedValue([]);
    mockPostCount.mockResolvedValue(20);

    const result = await getPostRanking({ limit: 10, page: 1 });

    expect(result.totalPages).toBe(2);
  });

  it("uses skip for page 2", async () => {
    mockPostFindMany.mockResolvedValue([]);
    mockPostCount.mockResolvedValue(0);

    await getPostRanking({ limit: 10, page: 2 });

    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it("uses skip for page 3 with limit 5", async () => {
    mockPostFindMany.mockResolvedValue([]);
    mockPostCount.mockResolvedValue(0);

    await getPostRanking({ limit: 5, page: 3 });

    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
  });

  it("passes category filter to both findMany and count", async () => {
    const categoryWhere = {
      aiPostCategories: {
        some: { category: { slug: "health-medicine" } },
      },
    };
    mockPostFindMany.mockResolvedValue([]);
    mockPostCount.mockResolvedValue(0);

    await getPostRanking({ limit: 10, page: 1, category: "health-medicine" });

    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: categoryWhere,
      })
    );
    expect(mockPostCount).toHaveBeenCalledWith({ where: categoryWhere });
  });

  it("does not include category filter when category is not provided", async () => {
    mockPostFindMany.mockResolvedValue([]);
    mockPostCount.mockResolvedValue(0);

    await getPostRanking({ limit: 10, page: 1 });

    const findManyArgs = mockPostFindMany.mock.calls[0][0];
    const countArgs = mockPostCount.mock.calls[0][0];
    expect(findManyArgs.where).not.toHaveProperty("aiPostCategories");
    expect(countArgs.where).not.toHaveProperty("aiPostCategories");
  });

  it("returns empty posts array when no posts exist", async () => {
    mockPostFindMany.mockResolvedValue([]);
    mockPostCount.mockResolvedValue(0);

    const result = await getPostRanking({ limit: 10, page: 1 });

    expect(result.posts).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("returns totalPages 1 when totalCount is less than limit", async () => {
    mockPostFindMany.mockResolvedValue([makePost()]);
    mockPostCount.mockResolvedValue(1);

    const result = await getPostRanking({ limit: 10, page: 1 });

    expect(result.totalPages).toBe(1);
  });

  it("maps latestReportAt from the most recent report", async () => {
    const reportDate = new Date("2026-03-05T12:00:00Z");
    mockPostFindMany.mockResolvedValue([
      makePost({ reports: [{ createdAt: reportDate }] }),
    ]);
    mockPostCount.mockResolvedValue(1);

    const result = await getPostRanking({ limit: 10, page: 1 });

    expect(result.posts[0].latestReportAt).toEqual(reportDate);
  });

  it("returns null latestReportAt when post has no reports", async () => {
    mockPostFindMany.mockResolvedValue([makePost({ reports: [] })]);
    mockPostCount.mockResolvedValue(1);

    const result = await getPostRanking({ limit: 10, page: 1 });

    expect(result.posts[0].latestReportAt).toBeNull();
  });

  it("orders by reportCount desc, createdAt desc, id desc", async () => {
    mockPostFindMany.mockResolvedValue([]);
    mockPostCount.mockResolvedValue(0);

    await getPostRanking({ limit: 10, page: 1 });

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
    mockPostCount.mockResolvedValue(0);

    await getPostRanking({ limit: 10, page: 1 });

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

describe("PostServiceError", () => {
  it("has correct name, message, and statusCode", () => {
    const error = new PostServiceError("test error", 400);

    expect(error.name).toBe("PostServiceError");
    expect(error.message).toBe("test error");
    expect(error.statusCode).toBe(400);
    expect(error).toBeInstanceOf(Error);
  });
});
