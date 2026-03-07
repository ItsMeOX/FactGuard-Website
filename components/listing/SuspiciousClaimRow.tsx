import { ClaimSource } from '@/types/types';
import styles from './suspiciousclaimrow.module.css';
import Image from 'next/image';
import { getIconAndName } from '@/app/utils/claimSource';
import { formatHoursAgo } from '@/app/utils/formatTime';

export default function SuspiciousClaimRow({
  title,
  description,
  imgUrl,
  source,
  commentCount,
}: {
  title: string;
  description: string;
  imgUrl: string;
  source: ClaimSource;
  commentCount: number;
}) {
  const { icon: srcIcon, name: srcName } = getIconAndName(source);

  return (
    <div className={styles.container}>
      <div className={styles.imageSection}>
        <Image
          src={imgUrl}
          alt='thumbnail'
          fill
          style={{ objectFit: 'cover' }}
        />
      </div>
      <div className={styles.textSection}>
        <div className={styles.titleWrapper}>
          <span className={styles.title}>{title}</span>
          <div className={styles.srcWrapper}>
            <Image src={srcIcon} alt='src icon' width={20} height={20} />
            <span>{srcName}</span>
          </div>
        </div>
        <span className={styles.description}>{description}</span>
        <div className={styles.metadata}>
          <span>1 hour ago</span>
          <span>{commentCount} comment{commentCount > 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
