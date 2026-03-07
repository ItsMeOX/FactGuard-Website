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
