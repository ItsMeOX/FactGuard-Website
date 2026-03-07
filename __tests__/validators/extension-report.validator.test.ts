import {
  createExtensionChatReportSchema,
} from "@/lib/validators/extension-report.validator";

const validInput = {
  headline: "Unverified health claims in group chat",
  platform: "whatsapp",
  messages: [
    { sender: "User A", text: "This supplement cures cancer" },
    { sender: "User B", text: "Where did you hear that?" },
  ],
  reportDescription: "The chat contains unverified medical claims.",
  supportingEvidence: "No peer-reviewed sources cited.",
};

describe("createExtensionChatReportSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createExtensionChatReportSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input without optional supportingEvidence", () => {
    const { supportingEvidence: _, ...input } = validInput;
    const result = createExtensionChatReportSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with conversationKey", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      conversationKey: "conv-abc-123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with message timestamp", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      messages: [
        { sender: "User A", text: "Hello", timestamp: "2026-01-01T12:00:00Z" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty headline", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      headline: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects headline longer than 500 characters", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      headline: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts headline of exactly 500 characters", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      headline: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty platform", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      platform: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects platform longer than 50 characters", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      platform: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty messages array", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      messages: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects message with empty sender", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      messages: [{ sender: "", text: "Hello" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects message with empty text", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      messages: [{ sender: "User A", text: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty reportDescription", () => {
    const result = createExtensionChatReportSchema.safeParse({
      ...validInput,
      reportDescription: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing headline", () => {
    const { headline: _, ...input } = validInput;
    const result = createExtensionChatReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing platform", () => {
    const { platform: _, ...input } = validInput;
    const result = createExtensionChatReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing messages", () => {
    const { messages: _, ...input } = validInput;
    const result = createExtensionChatReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing reportDescription", () => {
    const { reportDescription: _, ...input } = validInput;
    const result = createExtensionChatReportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = createExtensionChatReportSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
