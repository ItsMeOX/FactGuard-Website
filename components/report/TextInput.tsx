import Image from 'next/image';
import styles from './textinput.module.css';

export default function TextInput({
  title,
  onInput,
  iconUrl,
  placeholder,
  required = false,
  type = 'text',
}: {
  title: string;
  onInput: (url: string) => void;
  iconUrl?: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'password';
}) {
  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        {iconUrl && <Image src={iconUrl} alt='icon' width={20} height={20} />}
        <span className={styles.title}>{title}</span>
        {required && <span style={{ color: 'red' }}>*</span>}
      </div>
      <div className={styles.inputSection}>
        <input
          onChange={(e) => onInput(e.target.value)}
          type={type}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
