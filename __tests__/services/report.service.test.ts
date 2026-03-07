jest.mock("@/lib/services/post-processing.service", () => ({
  processPost: jest.fn().mockResolvedValue(undefined),
}));

import { createReport, ReportError } from "@/lib/services/report.service";
import { processPost } from "@/lib/services/post-processing.service";

const mockProcessPost = processPost as jest.Mock;

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    report: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const mockPostFindUnique = prisma.post.findUnique as jest.Mock;
const mockPostCreate = prisma.post.create as jest.Mock;
const mockReportFindUnique = prisma.report.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const userId = "550e8400-e29b-41d4-a716-446655440000";

const validInput = {
  sourceUrl: "https://example.com/article?utm_source=twitter",
  headline: "Misleading claim about climate change",
  reportDescription: "This article contains false statements.",
  supportingEvidence: "NASA data contradicts the claims.",
  platform: "Facebook",
};

const mockPost = {
  id: "post-uuid-1",
  sourceUrl: "https://example.com/article",
  normalizedUrl: "https://example.com/article",
  processedStatus: "pending",
  reportCount: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockReport = {
  id: "report-uuid-1",
  postId: mockPost.id,
  userId,
  headline: validInput.headline,
  platform: validInput.platform,
  reportDescription: validInput.reportDescription,
  supportingEvidence: validInput.supportingEvidence,
  status: "pending",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createReport", () => {
  it("creates a new post and report when normalizedUrl does not exist", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 1 },
    ]);

    const result = await createReport(userId, validInput);

    expect(result.report.id).toBe("report-uuid-1");
    expect(result.report.headline).toBe(validInput.headline);
    expect(result.report.status).toBe("pending");
    expect(result.postReportCount).toBe(1);
  });

  it("reuses existing post when normalizedUrl already exists", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 5 },
    ]);

    const result = await createReport(userId, validInput);

    expect(mockPostCreate).not.toHaveBeenCalled();
    expect(result.postReportCount).toBe(5);
  });

  it("normalizes the URL before looking up the post", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 1 },
    ]);

    await createReport(userId, validInput);

    expect(mockPostFindUnique).toHaveBeenCalledWith({
      where: { normalizedUrl: "https://example.com/article" },
    });
  });

  it("throws 409 when user has already reported the same post", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(mockReport);

    await expect(createReport(userId, validInput)).rejects.toThrow(
      ReportError
    );
    await expect(createReport(userId, validInput)).rejects.toMatchObject({
      message: "You have already reported this post",
      statusCode: 409,
    });
  });

  it("does not create report or increment count when duplicate detected", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(mockReport);

    await expect(createReport(userId, validInput)).rejects.toThrow();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("creates post with pending processedStatus and derived sourceType for new URLs", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 1 },
    ]);

    await createReport(userId, validInput);

    expect(mockPostCreate).toHaveBeenCalledWith({
      data: {
        sourceUrl: validInput.sourceUrl,
        normalizedUrl: "https://example.com/article",
        sourceType: "WEBPAGE",
        processedStatus: "pending",
      },
    });
  });

  it("passes correct data to the transaction", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 1 },
    ]);

    await createReport(userId, validInput);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("stores supportingEvidence as null when not provided", async () => {
    const inputWithoutEvidence = {
      sourceUrl: "https://example.com/article",
      headline: "Test headline",
      reportDescription: "Test description",
      platform: "Twitter",
    };
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      { ...mockReport, supportingEvidence: null },
      { ...mockPost, reportCount: 1 },
    ]);

    const result = await createReport(userId, inputWithoutEvidence);

    expect(result.report.supportingEvidence).toBeNull();
  });

  it("does not expose postId or userId in the returned report", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 1 },
    ]);

    const result = await createReport(userId, validInput);

    expect(result.report).not.toHaveProperty("postId");
    expect(result.report).not.toHaveProperty("userId");
  });

  it("fires processPost for new posts (fire-and-forget)", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 1 },
    ]);

    await createReport(userId, validInput);

    expect(mockProcessPost).toHaveBeenCalledWith(mockPost.id);
  });

  it("does not fire processPost for existing posts", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 2 },
    ]);

    await createReport(userId, validInput);

    expect(mockProcessPost).not.toHaveBeenCalled();
  });

  it("does not block report creation if processPost fails", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockTransaction.mockResolvedValue([
      mockReport,
      { ...mockPost, reportCount: 1 },
    ]);
    mockProcessPost.mockRejectedValue(new Error("Processing failed"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const result = await createReport(userId, validInput);

    expect(result.report.id).toBe("report-uuid-1");
    consoleSpy.mockRestore();
  });
});

describe("ReportError", () => {
  it("has correct name, message, and statusCode", () => {
    const error = new ReportError("test message", 418);
    expect(error.name).toBe("ReportError");
    expect(error.message).toBe("test message");
    expect(error.statusCode).toBe(418);
    expect(error).toBeInstanceOf(Error);
  });
});
