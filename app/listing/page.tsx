'use client';

import { useEffect, useState } from 'react';
import Searchbar from '@/components/listing/Searchbar';
import styles from './listing.module.css';
import type {
  CategoryRankingApiResponse,
  ListingTrendingTopic,
  PostRankingApiResponse,
} from '@/types/types';
import { ClaimSource } from '@/types/types';
import TrendingTopicCom from '@/components/listing/TrendingTopic';
import SuspiciousClaimRow from '@/components/listing/SuspiciousClaimRow';
import CategoryFilter from '@/components/listing/CategoryFilter';
import { mapSourceTypeToClaimSource } from '@/app/utils/mapSourceType';
import Link from 'next/link';

const TRENDING_TOPICS_LIMIT = 3;
const RECENT_CLAIMS_LIMIT = 10;
const FALLBACK_THUMBNAIL = '/medical_claim.png';

const CATEGORY_OPTIONS: { label: string; value: string }[] = [
  { label: 'All categories', value: '' },
  { label: 'Health & Medicine', value: 'health-medicine' },
  { label: 'Politics & Government', value: 'politics-government' },
  { label: 'Science & Technology', value: 'science-technology' },
  { label: 'Environment & Climate', value: 'environment-climate' },
  { label: 'Finance & Economy', value: 'finance-economy' },
  { label: 'Social Media & Viral', value: 'social-media-viral' },
  { label: 'Education', value: 'education' },
  { label: 'Entertainment', value: 'entertainment' },
  { label: 'International Affairs', value: 'international-affairs' },
  { label: 'Consumer & Product', value: 'consumer-product' },
];

function mapCategoryRankingToTrendingTopics(
  data: CategoryRankingApiResponse
): ListingTrendingTopic[] {
  return data.categories.map((row) => {
    const firstPost = row.posts[0];
    const imgUrl = firstPost?.thumbnailUrl ?? FALLBACK_THUMBNAIL;
    return {
      category: {
        id: row.category.id,
        name: row.category.name,
        slug: row.category.slug,
      },
      totalReportCount: row.totalReportCount,
      posts: [{ imgUrl }],
    };
  });
}

type RecentClaimItem = {
  id: string;
  title: string;
  description: string;
  imgUrl: string;
  source: ClaimSource;
  commentCount: number;
};

function mapPostRankingToRecentClaims(
  data: PostRankingApiResponse
): RecentClaimItem[] {
  return data.posts.map((p) => ({
    id: p.id,
    title: p.headline ?? 'Untitled',
    description: '',
    imgUrl: p.thumbnailUrl ?? FALLBACK_THUMBNAIL,
    source: mapSourceTypeToClaimSource(p.sourceType),
    commentCount: p.commentCount,
  }));
}

type PostsListState = {
  posts: RecentClaimItem[];
  totalCount: number;
  page: number;
  totalPages: number;
};

const INITIAL_POSTS_STATE: PostsListState = {
  posts: [],
  totalCount: 0,
  page: 1,
  totalPages: 0,
};

export default function ListingPage() {
  const [searchString, setSearchString] = useState('');
  const [selectedCategory, setSelectedCategory] = useState({
    label: 'All categories',
    value: '',
  });
  const [trendingTopics, setTrendingTopics] = useState<ListingTrendingTopic[]>([]);
  const [postsList, setPostsList] = useState<PostsListState>(INITIAL_POSTS_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/categories/ranking?limit=${TRENDING_TOPICS_LIMIT}`
        );
        if (cancelled) return;
        if (!response.ok) return;
        const data = (await response.json()) as CategoryRankingApiResponse;
        if (cancelled) return;
        setTrendingTopics(mapCategoryRankingToTrendingTopics(data));
      } catch {
        if (!cancelled) setTrendingTopics([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const categorySlug = selectedCategory.value.trim();
    const params = new URLSearchParams({
      page: String(postsList.page),
      limit: String(RECENT_CLAIMS_LIMIT),
    });
    if (categorySlug) params.set('category', categorySlug);

    async function load() {
      try {
        const response = await fetch(`/api/posts?${params.toString()}`);
        if (cancelled) return;
        if (!response.ok) return;
        const data = (await response.json()) as PostRankingApiResponse;
        if (cancelled) return;
        setPostsList({
          posts: mapPostRankingToRecentClaims(data),
          totalCount: data.totalCount,
          page: data.page,
          totalPages: data.totalPages,
        });
      } catch {
        if (!cancelled) setPostsList(INITIAL_POSTS_STATE);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postsList.page, selectedCategory.value]);

  function handleSearch(query: string) {
    setSearchString(query);
  }

  function handleSelectCategory(option: { label: string; value: string }) {
    setSelectedCategory(option);
    setPostsList((prev) => ({ ...prev, page: 1 }));
  }

  function handlePageChange(nextPage: number) {
    setPostsList((prev) => ({ ...prev, page: nextPage }));
  }

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.title}>Browse Suspicious Claim</div>
        <div className={styles.searchSection}>
          <Searchbar text={searchString} onInput={handleSearch} />
          <CategoryFilter
            data={CATEGORY_OPTIONS}
            selectedOption={selectedCategory}
            onInput={handleSelectCategory}
            placeholder='Select category'
          />
        </div>
        <span className={styles.sectionTitle}>Trending Topics</span>
        <div className={styles.trendSection}>
          {trendingTopics.map((topic, i) => (
            <TrendingTopicCom
              key={`trending-topic-${i}`}
              imgUrl={topic.posts[0]?.imgUrl ?? FALLBACK_THUMBNAIL}
              susCount={topic.totalReportCount}
              title={topic.category.name}
              onClick={() =>
                handleSelectCategory({
                  label: topic.category.name,
                  value: topic.category.slug,
                })
              }
            />
          ))}
        </div>
        <span className={styles.sectionTitle}>Recent Suspicious Claims</span>
        <div className={styles.susClaimSection}>
          {postsList.posts.map((claim) => (
            <Link key={claim.id} href={`/listing/${claim.id}`} className={styles.claimLink}>
              <SuspiciousClaimRow
                description={claim.description}
                imgUrl={claim.imgUrl}
                source={claim.source}
                title={claim.title}
                commentCount={claim.commentCount}
              />
            </Link>
          ))}
        </div>
        {postsList.totalPages > 1 && (
          <nav className={styles.pagination} aria-label='Pagination'>
            <button
              type='button'
              className={styles.paginationButton}
              disabled={postsList.page <= 1}
              onClick={() => handlePageChange(postsList.page - 1)}
            >
              Previous
            </button>
            <span className={styles.paginationInfo}>
              Page {postsList.page} of {postsList.totalPages}
            </span>
            <button
              type='button'
              className={styles.paginationButton}
              disabled={postsList.page >= postsList.totalPages}
              onClick={() => handlePageChange(postsList.page + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
