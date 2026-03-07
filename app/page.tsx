import Image from 'next/image';
import styles from './home.module.css';
import { CategoryRankingApiResponse, PopularClaim } from '@/types/types';
import PopularClaims from '@/components/home/PopularClaims';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api-base-url';
import { mapSourceTypeToClaimSource } from '@/app/utils/mapSourceType';

const POPULAR_CATEGORIES_LIMIT = 3;
const FALLBACK_THUMBNAIL = '/medical_claim.png';

async function fetchPopularClaims(): Promise<PopularClaim[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/categories/ranking?limit=${POPULAR_CATEGORIES_LIMIT}`;
  const response = await fetch(url, { next: { revalidate: 60 } });

  if (!response.ok) {
    throw new Error(`Failed to load categories: ${response.status}`);
  }

  const data = (await response.json()) as CategoryRankingApiResponse;

  return data.categories.map((row) => {
    const firstPost = row.posts[0];
    const thumbnailUrl =
      firstPost?.thumbnailUrl ?? FALLBACK_THUMBNAIL;
    const posts = row.posts.slice(0,3).map((p) => ({
      id: p.id,
      title: p.headline ?? 'Untitled',
      sourceType: mapSourceTypeToClaimSource(p.sourceType),
      time: new Date(p.latestReportAt!),
      reportCount: p.reportCount,
    }));

    return {
      title: row.category.name,
      imgUrl: thumbnailUrl,
      totalReportCount: row.totalReportCount,
      posts,
    };
  });
}

export default async function Home() {
  let popularClaims: PopularClaim[] = [];

  try {
    popularClaims = await fetchPopularClaims();
  } catch (error) {
    console.error('Home: failed to fetch category ranking', error);
  }

  return (
    <div className={styles.container}>
      <div className={styles.gradient} />
      <div className={styles.bannerSection}>
        <div className={styles.title}>
          Don&apos;t Let <span style={{ color: '#3C5AE1' }}>Misinformation</span>{' '}
          <br />
          Win the Narrative
        </div>
        <div className={styles.subtitle}>
          We track, verify, and debunk false claims in real-time so you can
          navigate the information landscape with confidence.
        </div>
        <Link href='/report' className={styles.verifyButton}>
          <Image src='/search.svg' alt='search' width={18} height={18} />
          Verify a Claim
        </Link>
      </div>
      <div className={styles.popularSection}>
        <div className={styles.popularHeader}>
          <div className={styles.trendingLabel}>
            <Image src='/fire.svg' alt='search' width={18} height={18} />
            <span style={{ color: '#CA3E3E' }}>Trending Now</span>
          </div>
          <div className={styles.popularTitle}>Popular Unverified Claims</div>
          <div className={styles.popularSubtitle}>
            These stories are currently spreading fast but remain unverified.{' '}
            <br />
            Always check before you share.
          </div>
        </div>
        <div className={styles.popularClaimsSection}>
          {popularClaims.length === 0 ? (
            <p className={styles.popularEmpty}>No trending categories right now.</p>
          ) : (
            <PopularClaims data={popularClaims} />
          )}
        </div>
      </div>
    </div>
  );
}
