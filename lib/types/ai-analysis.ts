export type AnalysisInput = {
  sourceUrl: string;
  userReports: {
    headline: string;
    reportDescription: string;
    supportingEvidence: string | null;
  }[];
  /** Full category list so the AI can choose the single best fit. */
  categories: { name: string; slug: string; description: string | null }[];
};

export type AnalysisResult = {
  aiHeadline: string;
  aiSummary: string;
  aiCredibilityScore: number;
  aiTransparencyNotes: string;
  categories: { slug: string; confidence: number }[];
  suggestedThumbnailUrl: string | null;
};
