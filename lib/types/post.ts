export type PostRankingItem = {
  id: string;
  headline: string | null;
  sourceType: string;
  thumbnailUrl: string | null;
  aiSummary: string | null;
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

export type PostDetailCategory = {
  slug: string;
  name: string;
  confidence: number | null;
};

export type PostDetailReport = {
  id: string;
  headline: string;
  platform: string;
  reportDescription: string;
  supportingEvidence: string | null;
  status: string;
  createdAt: Date;
};

export type PostDetailComment = {
  id: string;
  userId: string | null;
  userName: string | null;
  content: string;
  createdAt: Date;
  parentCommentId: string | null;
  replies: PostDetailComment[];
};

export type PostDetailPost = {
  id: string;
  sourceUrl: string;
  sourceType: string;
  headline: string | null;
  thumbnailUrl: string | null;
  aiSummary: string | null;
  aiCredibilityScore: number | null;
  aiTransparencyNotes: string | null;
  reportCount: number;
  createdAt: Date;
  categories: PostDetailCategory[];
};

export type PostDetail = {
  post: PostDetailPost;
  reports: PostDetailReport[];
  comments: PostDetailComment[];
};
