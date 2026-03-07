'use client';

import { useState } from 'react';
import Link from 'next/link';
import TextInput from '@/components/report/TextInput';
import styles from './report.module.css';
import MultipleChoiceInput from '@/components/report/MultipleChoiceInput';
import AreaTextInput from '@/components/report/AreaTextInput';
import ResponseModal, { type ResponseModalVariant } from '@/components/report/ResponseModal';
import { ClaimSource } from '@/types/types';
import { getAuthToken } from '@/lib/auth-client';

const INITIAL_REPORT_DATA = {
  url: '',
  title: '',
  platform: { label: '', value: '' },
  reason: '',
  evidence: '',
};

type ModalState = {
  isOpen: boolean;
  variant: ResponseModalVariant;
  title: string;
  message: string;
  detail?: React.ReactNode;
};

export default function ReportPage() {
  const claimSourceOptions = Object.values(ClaimSource).map((v) => ({
    label: v,
    value: v,
  }));

  const [reportData, setReportData] = useState(INITIAL_REPORT_DATA);
  const [formKey, setFormKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    variant: 'success',
    title: '',
    message: '',
  });

  function handleInputURL(url: string) {
    setReportData((prev) => ({ ...prev, url }));
  }
  function handleInputTitle(title: string) {
    setReportData((prev) => ({ ...prev, title }));
  }
  function handleInputPlatform(option: { label: string; value: string }) {
    setReportData((prev) => ({ ...prev, platform: option }));
  }
  function handleInputReason(reason: string) {
    setReportData((prev) => ({ ...prev, reason }));
  }
  function handleInputEvidence(evidence: string) {
    setReportData((prev) => ({ ...prev, evidence }));
  }

  function closeModal() {
    setModal((prev) => ({ ...prev, isOpen: false }));
  }

  async function handleSubmit() {
    const { url, title, platform, reason, evidence } = reportData;

    if (!url.trim() || !title.trim() || !reason.trim() || !evidence.trim()) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Missing fields',
        message: 'Please fill in Source URL, Claim or Headline, reason, and supporting evidence.',
      });
      return;
    }

    if (!platform.value.trim()) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Platform required',
        message: 'Please select the platform where you saw this claim.',
      });
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Sign in required',
        message: 'You must be signed in to submit a report.',
        detail: <Link href="/auth/login" className={styles.modalLink}>Go to login</Link>,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceUrl: url.trim(),
          headline: title.trim(),
          platform: platform.value.trim(),
          reportDescription: reason.trim(),
          supportingEvidence: evidence.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({ error: 'Invalid response' }));

      if (response.ok) {
        setModal({
          isOpen: true,
          variant: 'success',
          title: 'Report submitted',
          message: data.postId
            ? 'Your report has been submitted. Our team will review it. You can browse reports on the listing page.'
            : 'Your report has been submitted. This claim already had reports; your report was added.',
        });
        setReportData(INITIAL_REPORT_DATA);
        setFormKey((k) => k + 1);
      } else if (response.status === 401) {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Sign in required',
          message: data.error ?? 'Please sign in to submit a report.',
          detail: <Link href="/auth/login" className={styles.modalLink}>Go to login</Link>,
        });
      } else if (response.status === 409) {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Already reported',
          message: data.error ?? 'You have already reported this post.',
        });
      } else if (response.status === 400) {
        const details = data.details != null ? JSON.stringify(data.details) : null;
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Invalid input',
          message: data.error ?? 'Validation failed.',
          detail: details ? <span className={styles.detailText}>{details}</span> : undefined,
        });
      } else {
        setModal({
          isOpen: true,
          variant: 'error',
          title: 'Something went wrong',
          message: data.error ?? 'Please try again later.',
        });
      }
    } catch {
      setModal({
        isOpen: true,
        variant: 'error',
        title: 'Something went wrong',
        message: 'Could not submit the report. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <span className={styles.title}>
          Submit Report of Suspicious Information
        </span>
        <div key={formKey} className={styles.form}>
          <TextInput
            title='Source URL'
            iconUrl='/link.svg'
            onInput={handleInputURL}
            placeholder='https://example.com/article...'
            required={true}
          />
          <TextInput
            title='Claim or Headline'
            iconUrl='/document.svg'
            onInput={handleInputTitle}
            placeholder='Paste or type the false claim...'
            required={true}
          />
          <MultipleChoiceInput
            title='Platform Seen On'
            data={claimSourceOptions}
            selectedOption={reportData.platform}
            onInput={handleInputPlatform}
            placeholder='Select platform source'
            required={false}
          />
          <AreaTextInput
            title='Why do you think this is false?'
            onInput={handleInputReason}
            placeholder='Paste or type the false claim...'
            required={true}
          />
          <AreaTextInput
            title='Supporting Evidence'
            onInput={handleInputEvidence}
            placeholder='Links to credible sources that contradict this claim...'
            required={true}
            minHeight='150px'
          />
          <div className={styles.submitSection}>
            <button
              type='button'
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
            <span>
              By submitting this report, you agree that the information may be
              shared publicly on our forum page.
            </span>
          </div>
        </div>
      </div>
      <ResponseModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        detail={modal.detail}
      />
    </div>
  );
}
