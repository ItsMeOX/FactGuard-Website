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
};
