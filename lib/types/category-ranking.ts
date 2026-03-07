import type { PostRankingItem } from "@/lib/types/post";

export type CategoryRankingItem = {
  category: {
    id: number;
    slug: string;
    name: string;
  };
  totalReportCount: number;
  posts: PostRankingItem[];
};

export type CategoryRankingResult = {
  categories: CategoryRankingItem[];
};

export type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  total_report_count: bigint;
};
