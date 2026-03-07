import Link from 'next/link';
import styles from './header.module.css';

export default function Header() {
  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <Link href='/' className={styles.logo}></Link>
        <div className={styles.pageNavs}>
          <div className={styles.pageNav}>
            <Link href='/forum'>Forum</Link>
          </div>
          <div className={styles.pageNav}>
            <Link href='/reports'>Report</Link>
          </div>
        </div>
        <div className={styles.sepLine} />
        <button className={styles.button}>Sign up</button>
      </div>
    </div>
  );
}
