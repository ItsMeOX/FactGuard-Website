'use client';

import Image from 'next/image';
import styles from './login.module.css';
import TextInput from '@/components/report/TextInput';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  function handleInputEmail(text: string) {
    setForm((prev) => ({ ...prev, email: text }));
  }
  function handleInputPassword(text: string) {
    setForm((prev) => ({ ...prev, password: text }));
  }

  async function handleSubmit() {}

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <div className={styles.inputSection}>
          <span className={styles.title}>Welcome back</span>
          <div className={styles.input}>
            <TextInput
              title='Email address'
              placeholder='example@gmail.com'
              onInput={handleInputEmail}
            />
          </div>
          <div className={styles.input}>
            <TextInput
              title='Password'
              placeholder='password'
              onInput={handleInputPassword}
            />
          </div>

          <button onClick={handleSubmit} className={styles.submitButton}>
            Login
          </button>
          <span className={styles.newUser}>
            New user?
            <Link href='/auth/register'>register</Link>
          </span>
        </div>
        <div className={styles.artSection}>
          <Image src='/login_bg.png' alt='art' width={200} height={200} />
        </div>
      </div>
    </div>
  );
}
