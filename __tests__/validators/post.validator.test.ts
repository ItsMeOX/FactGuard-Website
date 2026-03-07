import { getPostsSchema } from "@/lib/validators/post.validator";

describe("getPostsSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = getPostsSchema.safeParse({
      cursor: "abc123",
      limit: 20,
      category: "health-medicine",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe("abc123");
      expect(result.data.limit).toBe(20);
      expect(result.data.category).toBe("health-medicine");
    }
  });

  it("defaults limit to 10 when not provided", () => {
    const result = getPostsSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it("accepts input with no fields (all optional)", () => {
    const result = getPostsSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBeUndefined();
      expect(result.data.category).toBeUndefined();
    }
  });

  it("coerces string limit to number", () => {
    const result = getPostsSchema.safeParse({ limit: "15" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(15);
    }
  });

  it("rejects limit below 1", () => {
    const result = getPostsSchema.safeParse({ limit: 0 });

    expect(result.success).toBe(false);
  });

  it("rejects limit above 50", () => {
    const result = getPostsSchema.safeParse({ limit: 51 });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer limit", () => {
    const result = getPostsSchema.safeParse({ limit: 10.5 });

    expect(result.success).toBe(false);
  });

  it("accepts limit at lower boundary (1)", () => {
    const result = getPostsSchema.safeParse({ limit: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(1);
    }
  });

  it("accepts limit at upper boundary (50)", () => {
    const result = getPostsSchema.safeParse({ limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("accepts cursor as any string value", () => {
    const result = getPostsSchema.safeParse({
      cursor: "eyJyZXBvcnRDb3VudCI6MTB9",
    });

    expect(result.success).toBe(true);
  });
});
