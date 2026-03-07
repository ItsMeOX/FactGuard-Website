import type { ChatMessage } from "@/lib/types/comment";

export type ReportResult = {
  report: {
    id: string;
    headline: string;
    reportDescription: string;
    supportingEvidence: string | null;
    platform: string;
    status: string;
    createdAt: Date;
    /** Chat messages (extension reports only). Stored in comment content for persistence. */
    messages?: ChatMessage[];
  };
  postReportCount: number;
  /** Set when a new post was created (so clients can trigger or track processing). */
  postId?: string;
};
