const mockGetCategoryRanking = jest.fn();

jest.mock("@/lib/services/category-ranking.service", () => ({
  getCategoryRanking: (...args: unknown[]) => mockGetCategoryRanking(...args),
}));

import { GET } from "@/app/api/categories/ranking/route";

beforeEach(() => {
  jest.clearAllMocks();
});

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/categories/ranking");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

const mockCategoryData = {
  categories: [
    {
      category: {
        id: 1,
        slug: "health-medicine",
        name: "Health & Medicine",
      },
      totalReportCount: 150,
      posts: [
        {
          id: "post-uuid-1",
          headline: "Test headline",
          sourceType: "WEBPAGE",
          thumbnailUrl: "https://example.com/thumb.jpg",
          reportCount: 25,
          latestReportAt: "2026-03-05T12:00:00Z",
        },
      ],
    },
  ],
};

describe("GET /api/categories/ranking", () => {
  it("returns 200 with categories, totalReportCount, and posts", async () => {
    mockGetCategoryRanking.mockResolvedValue(mockCategoryData);

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].category.slug).toBe("health-medicine");
    expect(data.categories[0].totalReportCount).toBe(150);
    expect(data.categories[0].posts).toHaveLength(1);
    expect(data.categories[0].posts[0].sourceType).toBe("WEBPAGE");
  });

  it("passes limit param to service", async () => {
    mockGetCategoryRanking.mockResolvedValue({ categories: [] });

    await GET(makeGetRequest({ limit: "15" }));

    expect(mockGetCategoryRanking).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 15 })
    );
  });

  it("uses default limit when not specified", async () => {
    mockGetCategoryRanking.mockResolvedValue({ categories: [] });

    await GET(makeGetRequest());

    expect(mockGetCategoryRanking).toHaveBeenCalledWith(
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
    const response = await GET(makeGetRequest({ limit: "25" }));

    expect(response.status).toBe(400);
  });

  it("returns 500 for unexpected errors", async () => {
    mockGetCategoryRanking.mockRejectedValue(new Error("Database connection lost"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    consoleSpy.mockRestore();
  });

  it("returns 200 with empty categories array when no categories exist", async () => {
    mockGetCategoryRanking.mockResolvedValue({ categories: [] });

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.categories).toEqual([]);
  });
});
