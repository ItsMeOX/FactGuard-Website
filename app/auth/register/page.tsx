'use client';

import Image from 'next/image';
import styles from './register.module.css';
import TextInput from '@/components/report/TextInput';
import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  function handleInputUsername(text: string) {
    setForm((prev) => ({ ...prev, username: text }));
  }
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
          <span className={styles.title}>Register user</span>
          <div className={styles.input}>
            <TextInput
              title='Username'
              placeholder='username'
              onInput={handleInputUsername}
            />
          </div>
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
            Register
          </button>
          <span className={styles.newUser}>
            Existing user?
            <Link href='/auth/login'>login</Link>
          </span>
        </div>
        <div className={styles.artSection}>
          <Image src='/login_bg.png' alt='art' width={200} height={200} />
        </div>
      </div>
    </div>
  );
}
