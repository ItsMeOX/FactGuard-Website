jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    post: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getCategoryRanking } from "@/lib/services/category-ranking.service";

const mockQueryRaw = prisma.$queryRaw as jest.Mock;
const mockPostFindMany = prisma.post.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function makeCategoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "health-medicine",
    name: "Health & Medicine",
    total_report_count: BigInt(150),
    ...overrides,
  };
}

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-uuid-1",
    headline: "Test headline",
    sourceType: "WEBPAGE",
    thumbnailUrl: "https://example.com/thumb.jpg",
    reportCount: 25,
    reports: [{ createdAt: new Date("2026-03-05T12:00:00Z") }],
    ...overrides,
  };
}

describe("getCategoryRanking", () => {
  it("returns categories sorted by total report count descending", async () => {
    mockQueryRaw.mockResolvedValue([
      makeCategoryRow({ id: 1, slug: "health-medicine", total_report_count: BigInt(150) }),
      makeCategoryRow({ id: 2, slug: "politics", total_report_count: BigInt(100) }),
    ]);
    mockPostFindMany.mockResolvedValue([makePost()]);

    const result = await getCategoryRanking({ limit: 10 });

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].category.slug).toBe("health-medicine");
    expect(result.categories[0].totalReportCount).toBe(150);
    expect(result.categories[1].category.slug).toBe("politics");
    expect(result.categories[1].totalReportCount).toBe(100);
  });

  it("invokes raw SQL query once for category ranking", async () => {
    mockQueryRaw.mockResolvedValue([]);

    await getCategoryRanking({ limit: 5 });

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it("fetches top 5 posts per category from config", async () => {
    mockQueryRaw.mockResolvedValue([
      makeCategoryRow({ id: 1 }),
      makeCategoryRow({ id: 2 }),
    ]);
    mockPostFindMany.mockResolvedValue([]);

    await getCategoryRanking({ limit: 10 });

    expect(mockPostFindMany).toHaveBeenCalledTimes(2);
    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        where: expect.objectContaining({
          aiPostCategories: expect.objectContaining({
            some: expect.any(Object),
          }),
        }),
      })
    );
  });

  it("returns empty categories array when no categories exist", async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await getCategoryRanking({ limit: 10 });

    expect(result.categories).toEqual([]);
    expect(mockPostFindMany).not.toHaveBeenCalled();
  });

  it("maps posts with latestReportAt from most recent report", async () => {
    const reportDate = new Date("2026-03-05T12:00:00Z");
    mockQueryRaw.mockResolvedValue([makeCategoryRow()]);
    mockPostFindMany.mockResolvedValue([
      makePost({ reports: [{ createdAt: reportDate }] }),
    ]);

    const result = await getCategoryRanking({ limit: 10 });

    expect(result.categories[0].posts[0].latestReportAt).toEqual(reportDate);
  });

  it("returns null latestReportAt when post has no reports", async () => {
    mockQueryRaw.mockResolvedValue([makeCategoryRow()]);
    mockPostFindMany.mockResolvedValue([makePost({ reports: [] })]);

    const result = await getCategoryRanking({ limit: 10 });

    expect(result.categories[0].posts[0].latestReportAt).toBeNull();
  });

  it("converts bigint total_report_count to number", async () => {
    mockQueryRaw.mockResolvedValue([
      makeCategoryRow({ total_report_count: BigInt(999) }),
    ]);
    mockPostFindMany.mockResolvedValue([]);

    const result = await getCategoryRanking({ limit: 10 });

    expect(result.categories[0].totalReportCount).toBe(999);
    expect(typeof result.categories[0].totalReportCount).toBe("number");
  });

  it("orders posts by reportCount desc within each category", async () => {
    mockQueryRaw.mockResolvedValue([makeCategoryRow()]);
    mockPostFindMany.mockResolvedValue([]);

    await getCategoryRanking({ limit: 10 });

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

  it("selects only required post fields for response", async () => {
    mockQueryRaw.mockResolvedValue([makeCategoryRow()]);
    mockPostFindMany.mockResolvedValue([]);

    await getCategoryRanking({ limit: 10 });

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

  it("runs post queries in parallel for multiple categories", async () => {
    mockQueryRaw.mockResolvedValue([
      makeCategoryRow({ id: 1 }),
      makeCategoryRow({ id: 2 }),
      makeCategoryRow({ id: 3 }),
    ]);
    mockPostFindMany.mockResolvedValue([]);

    await getCategoryRanking({ limit: 10 });

    expect(mockPostFindMany).toHaveBeenCalledTimes(3);
  });
});
