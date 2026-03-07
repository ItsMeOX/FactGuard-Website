import Image from 'next/image';
import styles from './home.module.css';
import { ClaimSource, PopularClaim } from '@/types/types';
import PopularClaims from '@/components/home/PopularClaims';

const popularClaims: PopularClaim[] = [
  {
    title:
      'Video shows an Iranian fighter jet destroying a U.S. warship during the Iran war',
    imgUrl: '/iran.jpg',
    posts: [
      {
        title:
          'Video shows an Iranian fighter jet destroying a U.S. warship during the Iran war',
        sourceType: ClaimSource.FACEBOOK,
        sourceUrl: '.',
        time: new Date(),
      },
      {
        title:
          'BREAKING: Iran Launches Secret Missile Strike on U.S. Base – Media Ordered Not to Report',
        sourceType: ClaimSource.X,
        sourceUrl: '.',
        time: new Date(),
      },
      {
        title: 'Video Shows Iranian Missiles Hitting U.S. Fleet in Gulf',
        sourceType: ClaimSource.X,
        sourceUrl: '.',
        time: new Date(),
      },
    ],
  },
  {
    title:
      'Video shows an Iranian fighter jet destroying a U.S. warship during the Iran war',
    imgUrl: '/iran.jpg',
    posts: [
      {
        title:
          'Video shows an Iranian fighter jet destroying a U.S. warship during the Iran war',
        sourceType: ClaimSource.FACEBOOK,
        sourceUrl: '.',
        time: new Date(),
      },
      {
        title:
          'BREAKING: Iran Launches Secret Missile Strike on U.S. Base – Media Ordered Not to Report',
        sourceType: ClaimSource.X,
        sourceUrl: '.',
        time: new Date(),
      },
      {
        title: 'Video Shows Iranian Missiles Hitting U.S. Fleet in Gulf',
        sourceType: ClaimSource.X,
        sourceUrl: '.',
        time: new Date(),
      },
    ],
  },
];

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.gradient} />
      <div className={styles.bannerSection}>
        <div className={styles.title}>
          Don't Let <span style={{ color: '#3C5AE1' }}>Misinformation</span>{' '}
          <br />
          Win the Narrative
        </div>
        <div className={styles.subtitle}>
          We track, verify, and debunk false claims in real-time so you can
          navigate the information landscape with confidence.
        </div>
        <button className={styles.verifyButton}>
          <Image src='/search.svg' alt='search' width={18} height={18} />
          Verify a Claim
        </button>
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
          <PopularClaims data={popularClaims} />
        </div>
      </div>
    </div>
  );
}
