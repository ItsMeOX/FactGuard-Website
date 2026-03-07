export type ReportResult = {
  report: {
    id: string;
    headline: string;
    reportDescription: string;
    supportingEvidence: string | null;
    platform: string;
    status: string;
    createdAt: Date;
  };
  postReportCount: number;
  /** Set when a new post was created (so clients can trigger or track processing). */
  postId?: string;
};
