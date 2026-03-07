'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import TextInput from '@/components/report/TextInput';
import ResponseModal from '@/components/report/ResponseModal';
import { setAuthToken } from '@/lib/auth-client';

type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', message: '' });

  function handleInputEmail(text: string) {
    setForm((prev) => ({ ...prev, email: text }));
  }
  function handleInputPassword(text: string) {
    setForm((prev) => ({ ...prev, password: text }));
  }

  async function handleSubmit() {
    const { email, password } = form;
    if (!email.trim() || !password) {
      setModal({
        isOpen: true,
        title: 'Missing fields',
        message: 'Please enter your email and password.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid response' }));

      if (response.ok) {
        setAuthToken(data.token);
        router.push('/');
        return;
      }

      if (response.status === 401) {
        setModal({
          isOpen: true,
          title: 'Sign in failed',
          message: data.error ?? 'Invalid email or password.',
        });
        return;
      }

      if (response.status === 400) {
        setModal({
          isOpen: true,
          title: 'Invalid input',
          message: data.error ?? 'Validation failed. Please check your email format.',
        });
        return;
      }

      setModal({
        isOpen: true,
        title: 'Something went wrong',
        message: data.error ?? 'Please try again later.',
      });
    } catch {
      setModal({
        isOpen: true,
        title: 'Something went wrong',
        message: 'Could not sign in. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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

          <button
            type="button"
            onClick={handleSubmit}
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Login'}
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
      <ResponseModal
        isOpen={modal.isOpen}
        onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))}
        variant="error"
        title={modal.title}
        message={modal.message}
      />
    </div>
  );
}
