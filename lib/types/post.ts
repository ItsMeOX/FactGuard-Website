export type PostRankingItem = {
  id: string;
  headline: string | null;
  sourceType: string;
  thumbnailUrl: string | null;
  reportCount: number;
  commentCount: number;
  latestReportAt: Date | null;
};

export type PostRankingResult = {
  posts: PostRankingItem[];
  totalCount: number;
  page: number;
  totalPages: number;
};
