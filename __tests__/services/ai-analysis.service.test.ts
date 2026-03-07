const mockCreate = jest.fn();

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

import { analyzePost, AnalysisError } from "@/lib/services/ai-analysis.service";
import type { AnalysisInput } from "@/lib/services/ai-analysis.service";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-openai-key";
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

const validInput: AnalysisInput = {
  sourceUrl: "https://example.com/article",
  userReports: [
    {
      headline: "Misleading vaccine claim",
      reportDescription: "This article makes false claims about vaccines.",
    },
  ],
  categorySlugs: ["health-medicine", "social-media-viral"],
};

const validAiResponse = {
  aiSummary: "The article makes unsubstantiated claims about vaccine safety.",
  aiCredibilityScore: 15,
  aiTransparencyNotes: "Assessment based on URL and user reports only; no page content or external fact-checks were available.",
  categories: [
    { slug: "health-medicine", confidence: 0.92 },
    { slug: "social-media-viral", confidence: 0.65 },
  ],
  suggestedThumbnailUrl: "https://example.com/og-image.jpg",
};

function mockOpenAiResponse(content: object | string) {
  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: typeof content === "string" ? content : JSON.stringify(content),
        },
      },
    ],
  });
}

describe("analyzePost", () => {
  it("returns parsed analysis with summary, score, notes, categories, and suggestedThumbnailUrl", async () => {
    mockOpenAiResponse(validAiResponse);

    const result = await analyzePost(validInput);

    expect(result.aiSummary).toBe(validAiResponse.aiSummary);
    expect(result.aiCredibilityScore).toBe(15);
    expect(result.aiTransparencyNotes).toBe(validAiResponse.aiTransparencyNotes);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].slug).toBe("health-medicine");
    expect(result.suggestedThumbnailUrl).toBe("https://example.com/og-image.jpg");
  });

  it("calls OpenAI with json_object response format", async () => {
    mockOpenAiResponse(validAiResponse);

    await analyzePost(validInput);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.3,
      })
    );
  });

  it("includes source URL in the user prompt", async () => {
    mockOpenAiResponse(validAiResponse);

    await analyzePost(validInput);

    const messages = mockCreate.mock.calls[0][0].messages;
    const userMessage = messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("https://example.com/article");
  });

  it("states that no scraped content or web search was provided", async () => {
    mockOpenAiResponse(validAiResponse);

    await analyzePost(validInput);

    const messages = mockCreate.mock.calls[0][0].messages;
    const userMessage = messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("No scraped page content or web search results were provided");
    expect(userMessage.content).toContain("Base your assessment solely on the source URL and the user reports");
  });

  it("includes user reports in the user prompt", async () => {
    mockOpenAiResponse(validAiResponse);

    await analyzePost(validInput);

    const messages = mockCreate.mock.calls[0][0].messages;
    const userMessage = messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("Misleading vaccine claim");
  });

  it("includes category slugs in the system prompt", async () => {
    mockOpenAiResponse(validAiResponse);

    await analyzePost(validInput);

    const messages = mockCreate.mock.calls[0][0].messages;
    const systemMessage = messages.find((m: { role: string }) => m.role === "system");
    expect(systemMessage.content).toContain("health-medicine");
    expect(systemMessage.content).toContain("social-media-viral");
  });

  it("parses and returns suggestedThumbnailUrl when valid URL", async () => {
    mockOpenAiResponse(validAiResponse);

    const result = await analyzePost(validInput);

    expect(result.suggestedThumbnailUrl).toBe("https://example.com/og-image.jpg");
  });

  it("returns null for suggestedThumbnailUrl when AI returns null", async () => {
    mockOpenAiResponse({ ...validAiResponse, suggestedThumbnailUrl: null });

    const result = await analyzePost(validInput);

    expect(result.suggestedThumbnailUrl).toBeNull();
  });

  it("returns null for suggestedThumbnailUrl when invalid or missing", async () => {
    mockOpenAiResponse({ ...validAiResponse, suggestedThumbnailUrl: "not-a-valid-url" });

    const result = await analyzePost(validInput);

    expect(result.suggestedThumbnailUrl).toBeNull();
  });

  it("clamps credibility score to 0-100 range", async () => {
    mockOpenAiResponse({ ...validAiResponse, aiCredibilityScore: 150 });

    const result = await analyzePost(validInput);

    expect(result.aiCredibilityScore).toBe(100);
  });

  it("defaults credibility score to 50 for non-numeric values", async () => {
    mockOpenAiResponse({ ...validAiResponse, aiCredibilityScore: "unknown" });

    const result = await analyzePost(validInput);

    expect(result.aiCredibilityScore).toBe(50);
  });

  it("filters out categories with confidence <= 0.5", async () => {
    mockOpenAiResponse({
      ...validAiResponse,
      categories: [
        { slug: "health-medicine", confidence: 0.9 },
        { slug: "entertainment", confidence: 0.3 },
      ],
    });

    const result = await analyzePost(validInput);

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].slug).toBe("health-medicine");
  });

  it("handles missing categories array gracefully", async () => {
    mockOpenAiResponse({ ...validAiResponse, categories: undefined });

    const result = await analyzePost(validInput);

    expect(result.categories).toEqual([]);
  });

  it("throws AnalysisError for empty OpenAI response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    await expect(analyzePost(validInput)).rejects.toThrow(AnalysisError);
    await expect(analyzePost(validInput)).rejects.toMatchObject({
      message: "Empty response from OpenAI",
    });
  });

  it("throws for invalid JSON in OpenAI response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not valid json{{{" } }],
    });

    await expect(analyzePost(validInput)).rejects.toThrow();
  });

  it("propagates OpenAI API errors", async () => {
    mockCreate.mockRejectedValue(new Error("Rate limit exceeded"));

    await expect(analyzePost(validInput)).rejects.toThrow("Rate limit exceeded");
  });
});

describe("AnalysisError", () => {
  it("has correct name and message", () => {
    const error = new AnalysisError("test error");
    expect(error.name).toBe("AnalysisError");
    expect(error.message).toBe("test error");
    expect(error).toBeInstanceOf(Error);
  });
});
