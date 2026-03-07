import { getPostsSchema } from "@/lib/validators/post.validator";

describe("getPostsSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = getPostsSchema.safeParse({
      page: 2,
      limit: 20,
      category: "health-medicine",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(20);
      expect(result.data.category).toBe("health-medicine");
    }
  });

  it("defaults page to 1 when not provided", () => {
    const result = getPostsSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
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
      expect(result.data.category).toBeUndefined();
    }
  });

  it("coerces string page to number", () => {
    const result = getPostsSchema.safeParse({ page: "3" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("coerces string limit to number", () => {
    const result = getPostsSchema.safeParse({ limit: "15" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(15);
    }
  });

  it("rejects page below 1", () => {
    const result = getPostsSchema.safeParse({ page: 0 });

    expect(result.success).toBe(false);
  });

  it("rejects limit below 1", () => {
    const result = getPostsSchema.safeParse({ limit: 0 });

    expect(result.success).toBe(false);
  });

  it("rejects limit above 50", () => {
    const result = getPostsSchema.safeParse({ limit: 51 });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer page", () => {
    const result = getPostsSchema.safeParse({ page: 1.5 });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer limit", () => {
    const result = getPostsSchema.safeParse({ limit: 10.5 });

    expect(result.success).toBe(false);
  });

  it("accepts page at lower boundary (1)", () => {
    const result = getPostsSchema.safeParse({ page: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("accepts limit at upper boundary (50)", () => {
    const result = getPostsSchema.safeParse({ limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });
});
