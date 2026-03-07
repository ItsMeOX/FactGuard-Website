import { z } from "zod";

const chatMessageSchema = z.object({
  sender: z.string().min(1, "Sender is required").max(200, "Sender must be at most 200 characters"),
  text: z.string().min(1, "Message text is required").max(10000, "Message text must be at most 10000 characters"),
  timestamp: z.string().optional(),
});

export const createExtensionChatReportSchema = z.object({
  headline: z
    .string()
    .min(1, "Headline is required")
    .max(500, "Headline must be at most 500 characters"),
  platform: z
    .string()
    .min(1, "Platform is required")
    .max(50, "Platform must be at most 50 characters"),
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(500, "At most 500 messages allowed"),
  reportDescription: z.string().min(1, "Report description is required"),
  supportingEvidence: z.string().optional(),
  conversationKey: z.string().max(500, "Conversation key must be at most 500 characters").optional(),
});

export type ExtensionChatReportInput = z.infer<typeof createExtensionChatReportSchema>;
