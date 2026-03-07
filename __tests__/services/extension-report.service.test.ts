jest.mock("@/lib/services/post-processing.service", () => ({
  processPost: jest.fn().mockResolvedValue(undefined),
}));

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
    comment: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import {
  createExtensionChatReport,
  ReportError,
} from "@/lib/services/extension-report.service";
import { processPost } from "@/lib/services/post-processing.service";
import { prisma } from "@/lib/prisma";

const mockPostFindUnique = prisma.post.findUnique as jest.Mock;
const mockPostCreate = prisma.post.create as jest.Mock;
const mockReportFindUnique = prisma.report.findUnique as jest.Mock;
const mockPostUpdate = prisma.post.update as jest.Mock;
const mockCommentCreate = prisma.comment.create as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockProcessPost = processPost as jest.Mock;

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

const validInput = {
  headline: "Unverified health claims in group chat",
  platform: "whatsapp",
  messages: [
    { sender: "User A", text: "This supplement cures cancer" },
    { sender: "User B", text: "Where did you hear that?" },
  ],
  reportDescription: "The chat contains unverified medical claims.",
  supportingEvidence: "No peer-reviewed sources cited.",
};

const mockPost = {
  id: "post-chat-uuid-1",
  sourceUrl: "Chat conversation on whatsapp (no public URL)",
  normalizedUrl: "chat:whatsapp:abc123",
  sourceType: "WHATSAPP_CHAT",
  thumbnailUrl: "/platform-logos/whatsapp.png",
  processedStatus: "pending",
  reportCount: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockReport = {
  id: "report-chat-uuid-1",
  postId: mockPost.id,
  userId: USER_ID,
  headline: validInput.headline,
  platform: validInput.platform,
  reportDescription: validInput.reportDescription,
  supportingEvidence: validInput.supportingEvidence,
  status: "pending",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockReportCreate = prisma.report.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockReportCreate.mockResolvedValue(mockReport);
  mockPostUpdate.mockResolvedValue({ ...mockPost, reportCount: 1 });
  mockCommentCreate.mockResolvedValue({});
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const mockTx = {
      report: { create: mockReportCreate },
      post: { update: mockPostUpdate },
      comment: { create: mockCommentCreate },
    };
    return fn(mockTx);
  });
});

describe("createExtensionChatReport", () => {
  it("creates new chat post and report when normalizedKey does not exist", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);

    const result = await createExtensionChatReport(USER_ID, validInput);

    expect(result.report.id).toBe("report-chat-uuid-1");
    expect(result.report.headline).toBe(validInput.headline);
    expect(result.report.status).toBe("pending");
    expect(result.postReportCount).toBe(1);
    expect(result.postId).toBe(mockPost.id);
  });

  it("creates post with WHATSAPP_CHAT sourceType and platform thumbnail for new chat", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);

    await createExtensionChatReport(USER_ID, validInput);

    expect(mockPostCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceUrl: "Chat conversation on whatsapp (no public URL)",
        normalizedUrl: expect.stringMatching(/^chat:whatsapp:/),
        sourceType: "WHATSAPP_CHAT",
        thumbnailUrl: "/platform-logos/whatsapp.png",
        processedStatus: "pending",
      }),
    });
  });

  it("uses conversationKey when provided for normalizedKey", async () => {
    const inputWithKey = {
      ...validInput,
      conversationKey: "conv-abc-123",
    };
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);

    await createExtensionChatReport(USER_ID, inputWithKey);

    expect(mockPostFindUnique).toHaveBeenCalledWith({
      where: { normalizedUrl: "chat:whatsapp:conv-abc-123" },
    });
  });

  it("reuses existing post when normalizedKey already exists", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockPostUpdate.mockResolvedValue({ ...mockPost, reportCount: 5 });

    const result = await createExtensionChatReport(USER_ID, validInput);

    expect(mockPostCreate).not.toHaveBeenCalled();
    expect(result.postReportCount).toBe(5);
    expect(result.postId).toBeUndefined();
  });

  it("throws 409 when user has already reported the same chat", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(mockReport);

    await expect(
      createExtensionChatReport(USER_ID, validInput)
    ).rejects.toThrow(ReportError);
    await expect(
      createExtensionChatReport(USER_ID, validInput)
    ).rejects.toMatchObject({
      message: "You have already reported this post",
      statusCode: 409,
    });
  });

  it("does not call transaction when duplicate report detected", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(mockReport);

    await expect(
      createExtensionChatReport(USER_ID, validInput)
    ).rejects.toThrow();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("fires processPost for new posts", async () => {
    mockPostFindUnique.mockResolvedValue(null);
    mockPostCreate.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);

    await createExtensionChatReport(USER_ID, validInput);

    expect(mockProcessPost).toHaveBeenCalledWith(mockPost.id);
  });

  it("does not fire processPost for existing posts", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockPostUpdate.mockResolvedValue({ ...mockPost, reportCount: 2 });

    await createExtensionChatReport(USER_ID, validInput);

    expect(mockProcessPost).not.toHaveBeenCalled();
  });

  it("creates comment with reportId and messages in content", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);

    await createExtensionChatReport(USER_ID, validInput);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockCommentCreate).toHaveBeenCalledTimes(1);
    const content = JSON.parse(mockCommentCreate.mock.calls[0][0].data.content);
    expect(content.type).toBe("report");
    expect(content.reportId).toBe(mockReport.id);
    expect(content.messages).toEqual(validInput.messages);
  });

  it("returns messages in report when extension submits chat", async () => {
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);

    const result = await createExtensionChatReport(USER_ID, validInput);

    expect(result.report.messages).toEqual(validInput.messages);
  });

  it("stores supportingEvidence as null when not provided", async () => {
    const inputWithoutEvidence = {
      ...validInput,
      supportingEvidence: undefined,
    };
    mockPostFindUnique.mockResolvedValue(mockPost);
    mockReportFindUnique.mockResolvedValue(null);
    mockReportCreate.mockResolvedValue({ ...mockReport, supportingEvidence: null });

    const result = await createExtensionChatReport(
      USER_ID,
      inputWithoutEvidence
    );

    expect(result.report.supportingEvidence).toBeNull();
  });
});
