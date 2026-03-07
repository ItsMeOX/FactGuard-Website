jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/services/post-processing.service", () => ({
  processPost: jest.fn(),
}));

import { POST } from "@/app/api/internal/process-posts/route";
import { prisma } from "@/lib/prisma";
import { processPost } from "@/lib/services/post-processing.service";

const mockPostFindMany = prisma.post.findMany as jest.Mock;
const mockProcessPost = processPost as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.INTERNAL_API_KEY = "test-internal-key";
  mockProcessPost.mockResolvedValue(undefined);
});

afterEach(() => {
  delete process.env.INTERNAL_API_KEY;
});

function makeRequest(apiKey?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return new Request("http://localhost:3000/api/internal/process-posts", {
    method: "POST",
    headers,
  });
}

describe("POST /api/internal/process-posts", () => {
  it("returns 401 when no API key is provided", async () => {
    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when API key is incorrect", async () => {
    const response = await POST(makeRequest("wrong-key"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 200 with processed count when authorized", async () => {
    mockPostFindMany.mockResolvedValue([
      { id: "post-uuid-1" },
      { id: "post-uuid-2" },
    ]);

    const response = await POST(makeRequest("test-internal-key"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processed).toBe(2);
    expect(data.total).toBe(2);
  });

  it("calls processPost for each pending post", async () => {
    mockPostFindMany.mockResolvedValue([
      { id: "post-uuid-1" },
      { id: "post-uuid-2" },
    ]);

    await POST(makeRequest("test-internal-key"));

    expect(mockProcessPost).toHaveBeenCalledWith("post-uuid-1");
    expect(mockProcessPost).toHaveBeenCalledWith("post-uuid-2");
    expect(mockProcessPost).toHaveBeenCalledTimes(2);
  });

  it("queries for posts with pending status older than 2 minutes", async () => {
    mockPostFindMany.mockResolvedValue([]);

    await POST(makeRequest("test-internal-key"));

    expect(mockPostFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          processedStatus: "pending",
          createdAt: { lt: expect.any(Date) },
        },
        select: { id: true },
        take: 10,
      })
    );
  });

  it("returns 200 with zero processed when no pending posts exist", async () => {
    mockPostFindMany.mockResolvedValue([]);

    const response = await POST(makeRequest("test-internal-key"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processed).toBe(0);
    expect(data.total).toBe(0);
  });

  it("continues processing remaining posts if one fails", async () => {
    mockPostFindMany.mockResolvedValue([
      { id: "post-uuid-1" },
      { id: "post-uuid-2" },
      { id: "post-uuid-3" },
    ]);
    mockProcessPost
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Processing failed"))
      .mockResolvedValueOnce(undefined);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await POST(makeRequest("test-internal-key"));
    const data = await response.json();

    expect(data.processed).toBe(2);
    expect(data.total).toBe(3);
    consoleSpy.mockRestore();
  });

  it("does not call processPost when unauthorized", async () => {
    await POST(makeRequest("wrong-key"));

    expect(mockProcessPost).not.toHaveBeenCalled();
    expect(mockPostFindMany).not.toHaveBeenCalled();
  });
});
