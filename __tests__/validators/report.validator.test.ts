import { createReportSchema } from "@/lib/validators/report.validator";

const validInput = {
  sourceUrl: "https://example.com/article",
  headline: "Misleading health claim about vaccines",
  reportDescription: "This article makes false claims about vaccine efficacy.",
  supportingEvidence: "CDC data contradicts the claims made.",
  platform: "Facebook",
};

describe("createReportSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createReportSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input without optional supportingEvidence", () => {
    const { supportingEvidence: _, ...input } = validInput;
    const result = createReportSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL format", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      sourceUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty sourceUrl", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      sourceUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty headline", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      headline: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects headline longer than 500 characters", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      headline: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts headline of exactly 500 characters", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      headline: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty reportDescription", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      reportDescription: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty platform", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      platform: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects platform longer than 50 characters", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      platform: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("accepts platform of exactly 50 characters", () => {
    const result = createReportSchema.safeParse({
      ...validInput,
      platform: "a".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sourceUrl", () => {
    const { sourceUrl: _, ...input } = validInput;
    const result = createReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing headline", () => {
    const { headline: _, ...input } = validInput;
    const result = createReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing reportDescription", () => {
    const { reportDescription: _, ...input } = validInput;
    const result = createReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing platform", () => {
    const { platform: _, ...input } = validInput;
    const result = createReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = createReportSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
