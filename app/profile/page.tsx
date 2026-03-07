'use client';

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import ResponseModal from '@/components/report/ResponseModal';
import { getAuthToken, clearAuthToken } from '@/lib/auth-client';

type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  reportCount: number;
};

type ModalState = {
  isOpen: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
};

function formatMemberSince(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function ProfilePageSkeleton(): ReactElement {
  return (
    <div
      className={styles.container}
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className={styles.form}>
        <h1 className={styles.title}>Profile</h1>
        <section>
          <h2 className={styles.sectionTitle}>Account information</h2>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <div
              className={`${styles.skeleton} ${styles.skeletonValue}`}
              aria-hidden
            />
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Display name</span>
            <div
              className={`${styles.skeleton} ${styles.skeletonInput}`}
              aria-hidden
            />
          </div>
          <button type="button" className={styles.submitButton} disabled>
            Save display name
          </button>
          <div className={styles.infoRow} style={{ marginTop: 16 }}>
            <span className={styles.infoLabel}>Member since</span>
            <div
              className={`${styles.skeleton} ${styles.skeletonValue}`}
              aria-hidden
            />
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Reports submitted</span>
            <div
              className={`${styles.skeleton} ${styles.skeletonValue}`}
              aria-hidden
            />
          </div>
        </section>
        <section>
          <h2 className={styles.sectionTitle}>Change password</h2>
          <div className={styles.field}>
            <label className={styles.infoLabel} htmlFor="skeleton-current-password">
              Current password
            </label>
            <div className={styles.inputWrap}>
              <input
                id="skeleton-current-password"
                type="password"
                placeholder="Current password"
                disabled
                aria-hidden
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.infoLabel} htmlFor="skeleton-new-password">
              New password
            </label>
            <div className={styles.inputWrap}>
              <input
                id="skeleton-new-password"
                type="password"
                placeholder="At least 8 characters"
                disabled
                aria-hidden
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.infoLabel} htmlFor="skeleton-confirm-password">
              Confirm new password
            </label>
            <div className={styles.inputWrap}>
              <input
                id="skeleton-confirm-password"
                type="password"
                placeholder="Confirm new password"
                disabled
                aria-hidden
              />
            </div>
          </div>
          <button type="button" className={styles.submitButton} disabled>
            Update password
          </button>
        </section>
        <section>
          <button type="button" className={styles.logoutButton} disabled>
            Log out
          </button>
        </section>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    variant: 'error',
    title: '',
    message: '',
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    async function fetchProfile() {
      try {
        const response = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          clearAuthToken();
          router.push('/auth/login');
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setModal({
            isOpen: true,
            variant: 'error',
            title: 'Could not load profile',
            message: (data.error as string) ?? 'Please try again later.',
          });
          return;
        }

        const data = (await response.json()) as { user: UserProfile };
        setProfile(data.user);
        setDisplayName(data.user.displayName ?? '');
      } catch {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Something went wrong',
          message: 'Could not load profile. Please check your connection.',
        });
      } finally {
        setIsLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [router]);

  async function handleSaveProfile() {
    if (!profile || !displayName.trim()) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Invalid input',
        message: 'Display name cannot be empty.',
      });
      return;
    }

    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid response' }));

      if (response.ok) {
        setProfile((prev) => (prev ? { ...prev, displayName: displayName.trim() } : null));
        setModal({
          isOpen: true,
          variant: 'success',
          title: 'Profile updated',
          message: 'Your display name has been saved.',
        });
        return;
      }

      if (response.status === 400) {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Validation failed',
          message: (data.error as string) ?? 'Please check your input.',
        });
        return;
      }

      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Update failed',
        message: (data.error as string) ?? 'Please try again later.',
      });
    } catch {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Something went wrong',
        message: 'Could not update profile. Please check your connection.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Missing fields',
        message: 'Please fill in all password fields.',
      });
      return;
    }
    if (newPassword.length < 8) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Password too short',
        message: 'New password must be at least 8 characters.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Passwords do not match',
        message: 'New password and confirmation must match.',
      });
      return;
    }

    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid response' }));

      if (response.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setModal({
          isOpen: true,
          variant: 'success',
          title: 'Password changed',
          message: 'Your password has been updated successfully.',
        });
        return;
      }

      if (response.status === 401) {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Current password incorrect',
          message: (data.error as string) ?? 'The current password you entered is wrong.',
        });
        return;
      }

      if (response.status === 400) {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Validation failed',
          message: (data.error as string) ?? 'Please check your input.',
        });
        return;
      }

      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Could not change password',
        message: (data.error as string) ?? 'Please try again later.',
      });
    } catch {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Something went wrong',
        message: 'Could not change password. Please check your connection.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  function handleLogout() {
    clearAuthToken();
    window.location.href = '/';
  }

  function closeModal() {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }

  if (isLoadingProfile) {
    return <ProfilePageSkeleton />;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h1 className={styles.title}>Profile</h1>

        <section>
          <h2 className={styles.sectionTitle}>Account information</h2>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{profile.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Display name</span>
            <div className={styles.inputWrap}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                aria-label="Display name"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            className={styles.submitButton}
            disabled={isSavingProfile}
          >
            {isSavingProfile ? 'Saving…' : 'Save display name'}
          </button>
          <div className={styles.infoRow} style={{ marginTop: 16 }}>
            <span className={styles.infoLabel}>Member since</span>
            <span className={styles.infoValue}>{formatMemberSince(profile.createdAt)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Reports submitted</span>
            <span className={styles.infoValue}>{profile.reportCount}</span>
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>Change password</h2>
          <div className={styles.field}>
            <label className={styles.infoLabel} htmlFor="current-password">
              Current password
            </label>
            <div className={styles.inputWrap}>
              <input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                placeholder="Current password"
                autoComplete="current-password"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.infoLabel} htmlFor="new-password">
              New password
            </label>
            <div className={styles.inputWrap}>
              <input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.infoLabel} htmlFor="confirm-password">
              Confirm new password
            </label>
            <div className={styles.inputWrap}>
              <input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleChangePassword}
            className={styles.submitButton}
            disabled={isChangingPassword}
          >
            {isChangingPassword ? 'Updating…' : 'Update password'}
          </button>
        </section>

        <section>
          <button
            type="button"
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Log out
          </button>
        </section>
      </div>

      <ResponseModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
      />
    </div>
  );
}
