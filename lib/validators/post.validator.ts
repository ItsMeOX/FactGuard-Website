import { z } from "zod";

export const getPostsSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(50, "Limit must be at most 50")
    .default(10),
  category: z.string().optional(),
});

export type GetPostsInput = z.infer<typeof getPostsSchema>;
