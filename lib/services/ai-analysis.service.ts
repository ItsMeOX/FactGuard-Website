import OpenAI from "openai";
import aiConfig from "@/lib/config/ai-analysis.config.json";
import type { AnalysisInput, AnalysisResult } from "@/lib/types/ai-analysis";

export type { AnalysisInput, AnalysisResult } from "@/lib/types/ai-analysis";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function analyzePost(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const openai = getClient();

  const systemPrompt = buildSystemPrompt(input.categories);
  const userPrompt = buildUserPrompt(input);

  const response = await openai.chat.completions.create({
    model: aiConfig.model,
    response_format: { type: aiConfig.responseFormat as "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: aiConfig.temperature,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new AnalysisError("Empty response from OpenAI");
  }

  return parseAnalysisResponse(content);
}

function buildSystemPrompt(
  categories: { name: string; slug: string; description: string | null }[]
): string {
  const { role, responseSchema, guidelines } = aiConfig.systemPrompt;
  const guidelinesText = guidelines.map((g) => `- ${g}`).join("\n");

  const categoryList = categories
    .map(
      (c) =>
        `- ${c.name} (slug: "${c.slug}")${c.description ? `: ${c.description}` : ""}`
    )
    .join("\n");

  return `${role}

${responseSchema}

You must assign exactly one category. Choose the single best-fitting category from this list:

${categoryList}

Guidelines:
${guidelinesText}`;
}

function buildUserPrompt(input: AnalysisInput): string {
  const sections: string[] = [];

  sections.push(`Source URL: ${input.sourceUrl}`);
  sections.push(
    "\nNo scraped page content or web search results were provided. Base your assessment solely on the source URL and the user reports below."
  );

  if (input.userReports.length > 0) {
    const reportsSection = input.userReports
      .map((r) => `- "${r.headline}": ${r.reportDescription}`)
      .join("\n");
    sections.push(`\nUser Reports (${input.userReports.length}):\n${reportsSection}`);
  }

  return sections.join("\n");
}

function isValidUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

const MAX_HEADLINE_LENGTH = 300;

function sanitizeHeadline(value: unknown): string {
  if (value == null || typeof value !== "string") return "";
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return "";
  return trimmed.length > MAX_HEADLINE_LENGTH
    ? trimmed.slice(0, MAX_HEADLINE_LENGTH).trim()
    : trimmed;
}

function parseAnalysisResponse(content: string): AnalysisResult {
  const parsed = JSON.parse(content);

  const aiHeadline = sanitizeHeadline(parsed.aiHeadline);
  const aiSummary = String(parsed.aiSummary || "");
  const aiTransparencyNotes = String(parsed.aiTransparencyNotes || "");

  let aiCredibilityScore = Number(parsed.aiCredibilityScore);
  if (isNaN(aiCredibilityScore))
    aiCredibilityScore = aiConfig.scoring.defaultOnParseFailure;
  aiCredibilityScore = Math.max(
    aiConfig.scoring.min,
    Math.min(aiConfig.scoring.max, aiCredibilityScore)
  );

  const categories: { slug: string; confidence: number }[] = [];
  if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
    const withConfidence = parsed.categories
      .filter((cat: { slug?: unknown; confidence?: unknown }) => cat?.slug)
      .map((cat: { slug: string; confidence?: number }) => ({
        slug: String(cat.slug),
        confidence:
          typeof cat.confidence === "number"
            ? Math.max(0, Math.min(1, cat.confidence))
            : 0.5,
      }));
    // Exactly one category: take the one with highest confidence (optionally above minConfidence when possible)
    type CategoryItem = { slug: string; confidence: number };
    const aboveMin = withConfidence.filter(
      (c: CategoryItem) => c.confidence > aiConfig.categories.minConfidence
    );
    const best =
      aboveMin.length > 0
        ? aboveMin.reduce((a: CategoryItem, b: CategoryItem) => (a.confidence >= b.confidence ? a : b))
        : withConfidence.reduce((a: CategoryItem, b: CategoryItem) => (a.confidence >= b.confidence ? a : b));
    categories.push(best);
  }

  let suggestedThumbnailUrl: string | null = null;
  if (parsed.suggestedThumbnailUrl != null) {
    if (typeof parsed.suggestedThumbnailUrl === "string" && isValidUrl(parsed.suggestedThumbnailUrl)) {
      suggestedThumbnailUrl = parsed.suggestedThumbnailUrl.trim();
    }
  }

  return {
    aiHeadline,
    aiSummary,
    aiCredibilityScore,
    aiTransparencyNotes,
    categories,
    suggestedThumbnailUrl,
  };
}

export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisError";
  }
}
