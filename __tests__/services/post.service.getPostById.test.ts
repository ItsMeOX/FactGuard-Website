const mockGetPostById = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
    },
  },
}));

import { getPostById } from "@/lib/services/post.service";
import { prisma } from "@/lib/prisma";

const mockPostFindUnique = prisma.post.findUnique as jest.Mock;

const POST_ID = "550e8400-e29b-41d4-a716-446655440000";

const mockPostRow = {
  id: POST_ID,
  sourceUrl: "https://example.com/article",
  sourceType: "WEBPAGE",
  headline: "Test headline",
  thumbnailUrl: "https://example.com/thumb.jpg",
  aiSummary: "Summary text",
  aiCredibilityScore: 65,
  aiTransparencyNotes: "Notes",
  reportCount: 2,
  createdAt: new Date("2026-01-01T12:00:00Z"),
  reports: [
    {
      id: "report-1",
      headline: "Report 1",
      platform: "Facebook",
      reportDescription: "Desc 1",
      supportingEvidence: "Evidence 1",
      status: "pending",
      createdAt: new Date("2026-01-02T10:00:00Z"),
    },
  ],
  comments: [
    {
      id: "comment-1",
      userId: "user-1",
      content: JSON.stringify({
        type: "report",
        reportId: "report-1",
        headline: "Report 1",
        reportDescription: "Desc 1",
        supportingEvidence: "Evidence 1",
      }),
      createdAt: new Date("2026-01-02T10:00:00Z"),
      parentCommentId: null,
    },
  ],
  aiPostCategories: [
    { confidence: 0.9, category: { slug: "health", name: "Health" } },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getPostById", () => {
  it("returns post detail with reports and comments when post exists", async () => {
    mockPostFindUnique.mockResolvedValue(mockPostRow);

    const result = await getPostById(POST_ID);

    expect(result).not.toBeNull();
    expect(result!.post.id).toBe(POST_ID);
    expect(result!.post.headline).toBe("Test headline");
    expect(result!.post.sourceType).toBe("WEBPAGE");
    expect(result!.post.reportCount).toBe(2);
    expect(result!.post.categories).toHaveLength(1);
    expect(result!.post.categories[0].slug).toBe("health");
    expect(result!.reports).toHaveLength(1);
    expect(result!.reports[0].platform).toBe("Facebook");
    expect(result!.comments).toHaveLength(1);
    expect(result!.comments[0].content).toContain("reportId");
  });

  it("returns null when post does not exist", async () => {
    mockPostFindUnique.mockResolvedValue(null);

    const result = await getPostById("non-existent-id");

    expect(result).toBeNull();
  });

  it("builds comment tree with replies", async () => {
    const rowWithReplies = {
      ...mockPostRow,
      comments: [
        {
          id: "comment-1",
          userId: "user-1",
          content: "Root comment",
          createdAt: new Date("2026-01-02T10:00:00Z"),
          parentCommentId: null,
        },
        {
          id: "comment-2",
          userId: "user-2",
          content: "Reply",
          createdAt: new Date("2026-01-02T11:00:00Z"),
          parentCommentId: "comment-1",
        },
      ],
    };
    mockPostFindUnique.mockResolvedValue(rowWithReplies);

    const result = await getPostById(POST_ID);

    expect(result!.comments).toHaveLength(1);
    expect(result!.comments[0].replies).toHaveLength(1);
    expect(result!.comments[0].replies[0].content).toBe("Reply");
  });
});
