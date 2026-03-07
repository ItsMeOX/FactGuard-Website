'use client';

import styles from './ResponseModal.module.css';

export type ResponseModalVariant = 'success' | 'error';

type ResponseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  variant: ResponseModalVariant;
  title: string;
  message: string;
  detail?: React.ReactNode;
};

export default function ResponseModal({
  isOpen,
  onClose,
  variant,
  title,
  message,
  detail,
}: ResponseModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="response-modal-title"
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <h2
          id="response-modal-title"
          className={variant === 'error' ? styles.titleError : styles.titleSuccess}
        >
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        {detail != null && <div className={styles.detail}>{detail}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
