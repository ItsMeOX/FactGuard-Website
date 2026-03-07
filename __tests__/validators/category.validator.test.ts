import { getCategoryRankingSchema } from "@/lib/validators/category.validator";

describe("getCategoryRankingSchema", () => {
  it("accepts valid input with limit", () => {
    const result = getCategoryRankingSchema.safeParse({ limit: 10 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it("defaults limit to 10 when not provided", () => {
    const result = getCategoryRankingSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it("coerces string limit to number", () => {
    const result = getCategoryRankingSchema.safeParse({ limit: "15" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(15);
    }
  });

  it("rejects limit below 1", () => {
    const result = getCategoryRankingSchema.safeParse({ limit: 0 });

    expect(result.success).toBe(false);
  });

  it("rejects limit above maxCategoryLimit", () => {
    const result = getCategoryRankingSchema.safeParse({ limit: 21 });

    expect(result.success).toBe(false);
  });

  it("accepts limit at lower boundary (1)", () => {
    const result = getCategoryRankingSchema.safeParse({ limit: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(1);
    }
  });

  it("accepts limit at upper boundary (20)", () => {
    const result = getCategoryRankingSchema.safeParse({ limit: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });
});
