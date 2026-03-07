import OpenAI from "openai";
import aiConfig from "@/lib/config/ai-analysis.config.json";

export type AnalysisInput = {
  sourceUrl: string;
  userReports: { headline: string; reportDescription: string }[];
  categorySlugs: string[];
};

export type AnalysisResult = {
  aiSummary: string;
  aiCredibilityScore: number;
  aiTransparencyNotes: string;
  categories: { slug: string; confidence: number }[];
  suggestedThumbnailUrl: string | null;
};

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

  const systemPrompt = buildSystemPrompt(input.categorySlugs);
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

function buildSystemPrompt(categorySlugs: string[]): string {
  const { role, responseSchema, guidelines } = aiConfig.systemPrompt;
  const guidelinesText = guidelines.map((g) => `- ${g}`).join("\n");

  return `${role}

${responseSchema}

Available category slugs: ${categorySlugs.join(", ")}

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

function parseAnalysisResponse(content: string): AnalysisResult {
  const parsed = JSON.parse(content);

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
  if (Array.isArray(parsed.categories)) {
    for (const cat of parsed.categories) {
      if (
        cat?.slug &&
        typeof cat.confidence === "number" &&
        cat.confidence > aiConfig.categories.minConfidence
      ) {
        categories.push({
          slug: String(cat.slug),
          confidence: Math.max(0, Math.min(1, cat.confidence)),
        });
      }
    }
  }

  let suggestedThumbnailUrl: string | null = null;
  if (parsed.suggestedThumbnailUrl != null) {
    if (typeof parsed.suggestedThumbnailUrl === "string" && isValidUrl(parsed.suggestedThumbnailUrl)) {
      suggestedThumbnailUrl = parsed.suggestedThumbnailUrl.trim();
    }
  }

  return {
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
