import Image from 'next/image';
import Link from 'next/link';
import styles from './claimrow.module.css';
import { PopularClaim } from '@/types/types';
import { getIconAndName } from '@/app/utils/claimSource';
import { formatHoursAgo } from '@/app/utils/formatTime';

export default function ClaimRow({ imgUrl, posts, title, totalReportCount }: PopularClaim) {
  const firstPostTime = formatHoursAgo(posts[0]?.time);
  const reportLabel = posts[0].reportCount === 1 ? '1 related report' : `${totalReportCount} related reports`;

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <Image src={imgUrl} alt='claim title' width={100} height={200} />
        <span className={styles.claimTitle}>{title}</span>
        <div className={styles.claimMetadata}>
          {firstPostTime} • {reportLabel}
        </div>
      </div>
      <div className={styles.postsSection}>
        {posts.map((post, i) => {
          const { icon: srcIcon, name: srcName } = getIconAndName(
            post.sourceType!,
          );
          return (
            <div className={styles.postRow} key={`popular-post-${i}`}>
              <div className={styles.postSrc}>
                <Image src={srcIcon} alt='src icon' width={16} height={16} />
                <span>{srcName}</span>
              </div>
              <div className={styles.postTitle}>
                <Link href={`/listing/${post.id}`}>{post.title}</Link>
              </div>
              <div className={styles.postTime}>{formatHoursAgo(post.time)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
