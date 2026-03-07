import { z } from "zod";
import categoryRankingConfig from "@/lib/config/category-ranking.config.json";

export const getCategoryRankingSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(
      categoryRankingConfig.maxCategoryLimit,
      `Limit must be at most ${categoryRankingConfig.maxCategoryLimit}`
    )
    .default(categoryRankingConfig.defaultCategoryLimit),
});

export type GetCategoryRankingInput = z.infer<typeof getCategoryRankingSchema>;
