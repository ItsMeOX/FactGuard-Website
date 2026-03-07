/**
 * Comment content can be either:
 * - A plain string (regular comment)
 * - A JSON string of ReportCommentContent (when the comment is created from a user report)
 */
export type ChatMessage = {
  sender: string;
  text: string;
  timestamp?: string;
};

export type ReportCommentContent = {
  type: "report";
  reportId: string;
  headline: string;
  reportDescription: string;
  supportingEvidence: string | null;
  /** Chat messages (extension reports only). Present so frontend can display the transcript. */
  messages?: ChatMessage[];
};

export function buildReportCommentContent(payload: {
  reportId: string;
  headline: string;
  reportDescription: string;
  supportingEvidence: string | null;
  messages?: ChatMessage[];
}): string {
  const content: ReportCommentContent = {
    type: "report",
    reportId: payload.reportId,
    headline: payload.headline,
    reportDescription: payload.reportDescription,
    supportingEvidence: payload.supportingEvidence,
    ...(payload.messages != null && payload.messages.length > 0 && { messages: payload.messages }),
  };
  return JSON.stringify(content);
}
