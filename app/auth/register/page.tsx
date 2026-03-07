'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './register.module.css';
import TextInput from '@/components/report/TextInput';
import ResponseModal from '@/components/report/ResponseModal';
import { setAuthToken } from '@/lib/auth-client';

const INITIAL_FORM = { username: '', email: '', password: '' };

type ModalState = {
  isOpen: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    variant: 'success',
    title: '',
    message: '',
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

  function closeModal() {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }

  function handleModalClose() {
    const wasSuccess = modal.variant === 'success';
    closeModal();
    if (wasSuccess) {
      router.push('/');
    }
  }

  async function handleSubmit() {
    const { username, email, password } = form;
    if (!email.trim()) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Missing email',
        message: 'Please enter your email address.',
      });
      return;
    }
    if (!password) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Missing password',
        message: 'Please enter a password (at least 8 characters).',
      });
      return;
    }
    if (password.length < 8) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Password too short',
        message: 'Password must be at least 8 characters.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: username.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid response' }));

      if (response.ok) {
        setAuthToken(data.token);
        setModal({
          isOpen: true,
          variant: 'success',
          title: 'Account registered',
          message: 'Your account was created successfully. You are now signed in and can submit reports.',
        });
        return;
      }

      if (response.status === 409) {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Email already registered',
          message: data.error ?? 'This email is already in use. Try signing in instead.',
        });
        return;
      }

      if (response.status === 400) {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Invalid input',
          message: data.error ?? 'Validation failed. Check your email and password (at least 8 characters).',
        });
        return;
      }

      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Something went wrong',
        message: data.error ?? 'Please try again later.',
      });
    } catch {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Something went wrong',
        message: 'Could not create account. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
              type='password'
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Register'}
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
      <ResponseModal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
      />
    </div>
  );
}
