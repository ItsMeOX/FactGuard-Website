import styles from './comment.module.css';
import type { ChatMessage } from '@/types/types';

export default function Comment({
  username,
  comment,
  userDesc,
  supportEvidence,
  messages,
}: {
  username: string;
  comment: string;
  userDesc: string;
  supportEvidence: string;
  messages?: ChatMessage[];
}) {
  return (
    <div className={styles.container}>
      <div className={styles.userSection}>
        <div className={styles.profilePic}>{username[0]}</div>
        <span className={styles.username}>{username}</span>
        <span className={styles.time}>1 hour ago</span>
      </div>
      <div className={styles.commentSection}>
        <div className={styles.indent} />
        <div className={styles.comments}>
          {comment && (
            <div className={styles.row}>
              <span className={styles.label}>Comment:</span>
              <span className={styles.comment}>{comment}</span>
            </div>
          )}

          {userDesc && (
            <div className={styles.row}>
              <span className={styles.label}>User Description:</span>
              <span className={styles.comment}>{userDesc}</span>
            </div>
          )}

          {supportEvidence && (
            <div className={styles.row}>
              <span className={styles.label}>Supporting Evidence:</span>
              <span className={styles.comment}>{supportEvidence}</span>
            </div>
          )}

          {messages != null && messages.length > 0 && (
            <div className={styles.row}>
              <span className={styles.label}>Messages:</span>
              <span className={styles.comment}>
                {messages.map((msg, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    <strong>{msg.sender}:</strong> {msg.text}
                    {msg.timestamp != null ? ` (${msg.timestamp})` : ''}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
