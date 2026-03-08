export type Report = {
  title: string;
  sourceUrl: string;
  sourceType: ClaimSource;
  userDescription: string; // false reason
  supportingEvidence: string;
};

// post for the detailed page
export type Post = {
  id: string;
  title: string;
  sourceType?: ClaimSource;
  sourceUrl?: string;
  imgUrl?: string;
  credibility?: string;
  transparency?: string;
  aiSummary?: string;
  score?: number;
  time: Date;
  reportCount: number;
  comments?: Comment[];
};

export type Comment = {
  user: User;
  userDescription: string | null;
  supportingEvidence: string | null;
  comment: string | null;
};

export type User = {
  id: number;
  name: string;
};

/** Chat message from extension report (report comment with messages). */
export type ChatMessage = {
  sender: string;
  text: string;
  timestamp?: string;
};

// for listing page
export type Categories = {
  category: Category;
  totalPostCount: number;
  posts: Post[];
};

export type Category = {
  id: number;
  slug: string;
  name: string;
};

// type for home page popular claim (summaries of popular posts)
export type PopularClaim = {
  title: string;
  imgUrl: string;
  totalReportCount: number;
  posts: Post[];
};

export enum ClaimSource {
  TIKTOK = 'TIKTOK',
  X = 'X',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  REDDIT = 'REDDIT',
  WEBPAGE = 'WEBPAGE',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  SIGNAL = 'SIGNAL',
}

// For listing page
export type TrendingTopic = {
  title: string;
  imgUrl: string;
  susCount: number;
};

/** Shape of GET /api/categories/ranking response (JSON-serialized). */
export type CategoryRankingApiResponse = {
  categories: Array<{
    category: { id: number; slug: string; name: string };
    totalReportCount: number;
    posts: Array<{
      id: string;
      headline: string | null;
      sourceType: string;
      thumbnailUrl: string | null;
      reportCount: number;
      latestReportAt: string | null;
    }>;
  }>;
};

/** Data shape for listing page trending topics (from categories/ranking API). */
export type ListingTrendingTopic = {
  category: Category;
  totalReportCount: number;
  posts: Array<{ imgUrl: string }>;
};

/** Shape of GET /api/posts response (JSON-serialized). */
export type PostRankingApiResponse = {
  posts: Array<{
    id: string;
    headline: string | null;
    sourceType: string;
    thumbnailUrl: string | null;
    aiSummary: string | null;
    reportCount: number;
    commentCount: number;
    latestReportAt: string | null;
  }>;
  totalCount: number;
  page: number;
  totalPages: number;
};

/** Shape of GET /api/posts/[id] response (JSON-serialized). */
export type PostDetailApiResponse = {
  post: {
    id: string;
    sourceUrl: string;
    sourceType: string;
    headline: string | null;
    thumbnailUrl: string | null;
    aiSummary: string | null;
    aiCredibilityScore: number | null;
    aiTransparencyNotes: string | null;
    reportCount: number;
    createdAt: string;
    categories: Array<{ slug: string; name: string; confidence: number | null }>;
  };
  reports: Array<{
    id: string;
    headline: string;
    platform: string;
    reportDescription: string;
    supportingEvidence: string | null;
    status: string;
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    userId: string | null;
    userName: string | null;
    content: string;
    createdAt: string;
    parentCommentId: string | null;
    replies: unknown[];
  }>;
};

/** Data shape for the listing detail page (app/listing/[id]). */
export type ListingDetailData = {
  id: string;
  title: string;
  sourceType: ClaimSource;
  sourceUrl: string;
  imgUrl: string;
  time: Date;
  aiSummary: string;
  credibility: string;
  transparency: string;
  score: number;
  /** True when post is from extension chat (e.g. WHATSAPP_CHAT); thumbnail is replaced by messages. */
  isMessagePost: boolean;
  /** When isMessagePost, messages to show in place of thumbnail (from first report comment). */
  topMessages: ChatMessage[] | null;
  comments: Array<{
    user: User;
    comment: string | null;
    supportingEvidence: string | null;
    userDescription: string | null;
    messages?: ChatMessage[];
    createdAt: Date;
  }>;
};
