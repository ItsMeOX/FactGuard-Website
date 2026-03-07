'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './header.module.css';
import { getAuthToken } from '@/lib/auth-client';

function ProfileIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
    </svg>
  );
}

export default function Header() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(getAuthToken()));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <Link href='/' className={styles.logo}>
          Fact<span style={{ color: '#3c5ae1' }}>Guard</span>
        </Link>
        <div className={styles.pageNavs}>
          <div className={styles.pageNav}>
            <Link href="/report">Report</Link>
          </div>
          <div className={styles.pageNav}>
            <Link href="/listing">Forum</Link>
          </div>
        </div>
        <div className={styles.sepLine} />
        {hasToken ? (
          <Link href="/profile" className={styles.profileLink} aria-label="Profile">
            <ProfileIcon />
          </Link>
        ) : (
          <div className={styles.authLinks}>
            <Link href="/auth/login" className={styles.loginLink}>
              Log in
            </Link>
            <button className={styles.button} type="button">
              <Link href="/auth/register">Sign up</Link>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
