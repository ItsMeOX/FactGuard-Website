import { z } from "zod";

export const createReportSchema = z.object({
  sourceUrl: z.string().url("Invalid URL format"),
  headline: z
    .string()
    .min(1, "Headline is required")
    .max(500, "Headline must be at most 500 characters"),
  reportDescription: z.string().min(1, "Report description is required"),
  supportingEvidence: z.string().optional(),
  platform: z
    .string()
    .min(1, "Platform is required")
    .max(50, "Platform must be at most 50 characters"),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
