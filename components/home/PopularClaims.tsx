import { PopularClaim } from '@/types/types';
import ClaimRow from './ClaimRow';
import styles from './popularclaims.module.css';
import React from 'react';

export default function PopularClaims({ data }: { data: PopularClaim[] }) {
  return (
    <div className={styles.container}>
      {data.map((d, i) => (
        <React.Fragment key={`popular-claim-${i}`}>
          <ClaimRow
            title={d.title}
            imgUrl={d.imgUrl}
            posts={d.posts}
            totalReportCount={d.totalReportCount}
          />
          {i < data.length - 1 && <div className={styles.separator}></div>}
        </React.Fragment>
      ))}
    </div>
  );
}
