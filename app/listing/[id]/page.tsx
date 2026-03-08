'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ClaimSource } from '@/types/types';
import type { ListingDetailData, PostDetailApiResponse } from '@/types/types';
import styles from './detail.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { getIconAndName } from '@/app/utils/claimSource';
import { mapPostDetailToPageData } from '@/app/utils/mapPostDetailToPageData';
import Comment from '@/components/listingdetail/Comment';

const FALLBACK_THUMBNAIL = '/medical_claim.png';
const SKELETON_SUMMARY_LINES = 3;
const SKELETON_COMMENT_BLOCKS = 3;

function isAbsoluteUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

function DetailPageSkeleton(): React.ReactNode {
  return (
    <div
      className={styles.container}
      aria-busy="true"
      aria-label="Loading post content"
    >
      <Link className={styles.backButton} href='/listing'>
        <Image src='/back.svg' alt='' width={20} height={20} />
        <span>back</span>
      </Link>
      <div
        className={`${styles.skeleton} ${styles.skeletonTitle}`}
        aria-hidden
      />
      <div
        className={`${styles.skeleton} ${styles.skeletonThumbnail}`}
        aria-hidden
      />
      <div className={styles.section}>
        <div
          className={`${styles.skeleton} ${styles.skeletonSectionTitle}`}
          aria-hidden
        />
        <div
          className={`${styles.skeleton} ${styles.skeletonInfoRow}`}
          aria-hidden
        />
      </div>
      <div className={styles.section}>
        <div
          className={`${styles.skeleton} ${styles.skeletonSectionTitle}`}
          aria-hidden
        />
        {Array.from({ length: SKELETON_SUMMARY_LINES }, (_, i) => (
          <div
            key={i}
            className={`${styles.skeleton} ${
              i === SKELETON_SUMMARY_LINES - 1
                ? styles.skeletonSummaryLineShort
                : styles.skeletonSummaryLine
            }`}
            aria-hidden
          />
        ))}
      </div>
      <div className={styles.section}>
        <div
          className={`${styles.skeleton} ${styles.skeletonSectionTitle}`}
          aria-hidden
        />
        {Array.from({ length: SKELETON_COMMENT_BLOCKS }, (_, i) => (
          <div
            key={i}
            className={`${styles.skeleton} ${styles.skeletonCommentBlock}`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

const PLACEHOLDER_DATA: ListingDetailData = {
  id: '',
  title: 'Loading...',
  sourceType: ClaimSource.WEBPAGE,
  sourceUrl: '',
  imgUrl: FALLBACK_THUMBNAIL,
  time: new Date(),
  aiSummary: '',
  credibility: '',
  transparency: '',
  score: 0,
  isMessagePost: false,
  topMessages: null,
  comments: [],
};

export default function DetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : null;
  const [data, setData] = useState<ListingDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) return;

    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const response = await fetch(`/api/posts/${id}`);
        if (cancelled) return;
        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
            return;
          }
          setError('Failed to load post');
          return;
        }
        const json = (await response.json()) as PostDetailApiResponse;
        if (cancelled) return;
        setData(mapPostDetailToPageData(json));
      } catch {
        if (!cancelled) setError('Failed to load post');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const displayData: ListingDetailData =
    data ??
    (error
      ? { ...PLACEHOLDER_DATA, title: error }
      : PLACEHOLDER_DATA);

  const isLoading = data === null && error === null;

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  const { icon: srcIcon, name: srcName } = getIconAndName(displayData.sourceType);

  return (
    <div className={styles.container}>
      <Link className={styles.backButton} href='/listing'>
        <Image src='/back.svg' alt='back' width={20} height={20} />
        <span>back</span>
      </Link>
      <span className={styles.title}>{displayData.title}</span>
      {displayData.isMessagePost && displayData.topMessages != null && displayData.topMessages.length > 0 ? (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Messages</span>
          <div className={styles.messagesBlock}>
            {displayData.topMessages.map((msg, i) => (
              <div key={i} className={styles.messageRow}>
                <strong>{msg.sender}:</strong> {msg.text}
                {msg.timestamp != null ? ` (${msg.timestamp})` : ''}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Image
          className={styles.thumbnail}
          src={displayData.imgUrl}
          alt='thumbnail'
          width={1200}
          height={400}
        />
      )}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Information section</span>
        <div className={styles.srcWrapper}>
          <Image src={srcIcon} alt='' width={30} height={30} />
          <span>{srcName}</span>
        </div>
        {displayData.sourceUrl.trim() ? (
          <div className={styles.sourceUrlBlock}>
            {isAbsoluteUrl(displayData.sourceUrl) ? (
              <a
                href={displayData.sourceUrl}
                target='_blank'
                rel='noopener noreferrer'
                className={styles.sourceUrlLink}
              >
                {displayData.sourceUrl}
              </a>
            ) : (
              <span className={styles.sourceUrlText}>{displayData.sourceUrl}</span>
            )}
          </div>
        ) : null}
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>
          Why our AI thinks this is misleading
        </span>
        <span>{displayData.aiSummary}</span>
      </div>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Discussion section</span>
        <div className={styles.commentSection}>
          {displayData.comments.map((comment, i) => (
            <Comment
              comment={comment.comment ?? ''}
              userDesc={comment.userDescription ?? ''}
              supportEvidence={comment.supportingEvidence ?? ''}
              username={comment.user.name}
              messages={comment.messages}
              createdAt={comment.createdAt}
              key={`comment-${i}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
