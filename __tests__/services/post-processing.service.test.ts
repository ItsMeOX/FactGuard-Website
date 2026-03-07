jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    report: {
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    aiPostCategory: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/services/ai-analysis.service", () => ({
  analyzePost: jest.fn(),
}));

import { processPost } from "@/lib/services/post-processing.service";
import { prisma } from "@/lib/prisma";
import { analyzePost } from "@/lib/services/ai-analysis.service";

const mockPostFindUnique = prisma.post.findUnique as jest.Mock;
const mockPostUpdate = prisma.post.update as jest.Mock;
const mockReportFindMany = prisma.report.findMany as jest.Mock;
const mockCategoryFindMany = prisma.category.findMany as jest.Mock;
const mockCategoryFindUnique = prisma.category.findUnique as jest.Mock;
const mockAiPostCategoryUpsert = prisma.aiPostCategory.upsert as jest.Mock;
const mockAiPostCategoryDeleteMany = prisma.aiPostCategory.deleteMany as jest.Mock;
const mockAnalyzePost = analyzePost as jest.Mock;

const mockPost = {
  id: "post-uuid-1",
  sourceUrl: "https://example.com/article",
  normalizedUrl: "https://example.com/article",
  headline: null,
  thumbnailUrl: null,
  scrapedContent: null,
  processedStatus: "pending",
  reportCount: 1,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockAnalysisResult = {
  aiHeadline: "Fact-check: Article contains false information about vaccines.",
  aiSummary: "The claim is misleading based on available evidence.",
  aiCredibilityScore: 25,
  aiTransparencyNotes: "Assessment based on URL and user reports only.",
  categories: [{ slug: "health-medicine", confidence: 0.85 }],
  suggestedThumbnailUrl: null as string | null,
};

const mockReports = [
  {
    headline: "Misleading claim",
    reportDescription: "This article contains false information.",
    supportingEvidence: null as string | null,
  },
];

const mockCategories = [
  { name: "Health & Medicine", slug: "health-medicine", description: "Health and medical claims" },
  { name: "Politics & Government", slug: "politics-government", description: "Political and government topics" },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation();
  jest.spyOn(console, "warn").mockImplementation();

  mockPostFindUnique.mockResolvedValue(mockPost);
  mockPostUpdate.mockResolvedValue(mockPost);
  mockReportFindMany.mockResolvedValue(mockReports);
  mockCategoryFindMany.mockResolvedValue(mockCategories);
  mockCategoryFindUnique.mockResolvedValue({ id: 1 });
  mockAnalyzePost.mockResolvedValue(mockAnalysisResult);
  mockAiPostCategoryUpsert.mockResolvedValue({});
  mockAiPostCategoryDeleteMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

describe("processPost", () => {
  it("runs the full pipeline and sets processedStatus to completed", async () => {
    await processPost("post-uuid-1");

    const statusUpdates = mockPostUpdate.mock.calls.map(
      (call) => call[0].data.processedStatus
    );
    expect(statusUpdates).toContain("processing");
    expect(statusUpdates).toContain("completed");
  });

  it("fetches all user reports for AI context", async () => {
    await processPost("post-uuid-1");

    expect(mockReportFindMany).toHaveBeenCalledWith({
      where: { postId: "post-uuid-1" },
      select: { headline: true, reportDescription: true, supportingEvidence: true },
    });
  });

  it("passes source URL, user reports, and full categories to AI analysis", async () => {
    await processPost("post-uuid-1");

    expect(mockAnalyzePost).toHaveBeenCalledWith({
      sourceUrl: "https://example.com/article",
      userReports: mockReports,
      categories: mockCategories,
    });
  });

  it("saves AI analysis results to the post", async () => {
    await processPost("post-uuid-1");

    expect(mockPostUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiSummary: mockAnalysisResult.aiSummary,
          aiCredibilityScore: mockAnalysisResult.aiCredibilityScore,
          aiTransparencyNotes: mockAnalysisResult.aiTransparencyNotes,
          processedStatus: "completed",
        }),
      })
    );
  });

  it("saves suggestedThumbnailUrl to post when analysis returns it", async () => {
    mockAnalyzePost.mockResolvedValue({
      ...mockAnalysisResult,
      suggestedThumbnailUrl: "https://example.com/og-image.jpg",
    });

    await processPost("post-uuid-1");

    const completedUpdate = mockPostUpdate.mock.calls.find(
      (call) => call[0].data.processedStatus === "completed"
    );
    expect(completedUpdate).toBeDefined();
    expect(completedUpdate![0].data.thumbnailUrl).toBe(
      "https://example.com/og-image.jpg"
    );
  });

  it("saves AI-generated headline to post (preferred over user report)", async () => {
    await processPost("post-uuid-1");

    const completedUpdate = mockPostUpdate.mock.calls.find(
      (call) => call[0].data.processedStatus === "completed"
    );
    expect(completedUpdate).toBeDefined();
    expect(completedUpdate![0].data.headline).toBe(mockAnalysisResult.aiHeadline);
  });

  it("falls back to first report headline when AI headline is empty", async () => {
    mockAnalyzePost.mockResolvedValue({
      ...mockAnalysisResult,
      aiHeadline: "",
    });

    await processPost("post-uuid-1");

    const completedUpdate = mockPostUpdate.mock.calls.find(
      (call) => call[0].data.processedStatus === "completed"
    );
    expect(completedUpdate).toBeDefined();
    expect(completedUpdate![0].data.headline).toBe("Misleading claim");
  });

  it("does not overwrite headline when post already has one (e.g. second report)", async () => {
    const existingHeadline = "Original AI-generated headline from first report.";
    mockPostFindUnique.mockResolvedValue({
      ...mockPost,
      headline: existingHeadline,
    });
    mockAnalyzePost.mockResolvedValue({
      ...mockAnalysisResult,
      aiHeadline: "Different headline from second processing.",
    });

    await processPost("post-uuid-1");

    const completedUpdate = mockPostUpdate.mock.calls.find(
      (call) => call[0].data.processedStatus === "completed"
    );
    expect(completedUpdate).toBeDefined();
    expect(completedUpdate![0].data.headline).toBeUndefined();
    expect(completedUpdate![0].data).not.toHaveProperty("headline");
  });

  it("deletes existing AI categories then upserts the single assigned category", async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 1 });

    await processPost("post-uuid-1");

    expect(mockAiPostCategoryDeleteMany).toHaveBeenCalledWith({
      where: { postId: "post-uuid-1" },
    });
    expect(mockCategoryFindUnique).toHaveBeenCalledWith({
      where: { slug: "health-medicine" },
      select: { id: true },
    });
    expect(mockAiPostCategoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          postId_categoryId: { postId: "post-uuid-1", categoryId: 1 },
        },
        update: { confidence: 0.85 },
        create: {
          postId: "post-uuid-1",
          categoryId: 1,
          confidence: 0.85,
        },
      })
    );
  });

  it("sets processedStatus to failed when AI analysis throws", async () => {
    mockAnalyzePost.mockRejectedValue(new Error("OpenAI rate limit"));

    await processPost("post-uuid-1");

    expect(mockPostUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { processedStatus: "failed" },
      })
    );
  });

  it("returns early if post is not found", async () => {
    mockPostFindUnique.mockResolvedValue(null);

    await processPost("nonexistent-id");

    expect(mockPostUpdate).not.toHaveBeenCalled();
  });

  it("sets processedStatus to processing before starting pipeline", async () => {
    await processPost("post-uuid-1");

    const firstUpdate = mockPostUpdate.mock.calls[0];
    expect(firstUpdate[0].data.processedStatus).toBe("processing");
  });
});
