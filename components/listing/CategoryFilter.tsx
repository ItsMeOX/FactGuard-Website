'use client';

import { useRef, useState } from 'react';
import styles from './categoryfilter.module.css';
import { useClickOutside } from '../report/useClickOutside';

export default function CategoryFilter({
  data,
  selectedOption,
  onInput,
  placeholder,
}: {
  data: { label: string; value: string }[];
  selectedOption: { label: string; value: string };
  onInput: (option: { label: string; value: string }) => void;
  placeholder?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  const selectContainerRef = useRef<HTMLDivElement>(null); // Clickable area that toggles the dropdown
  const dropdownContainerRef = useRef<HTMLDivElement>(null); // Dropdown menu container

  function handleToggleDropdown() {
    setShowDropdown((prev) => !prev);
  }

  function handleSelectOption(option: { label: string; value: string }) {
    onInput(option);
    setShowDropdown(false);
  }

  // Custom hook to close dropdown when clicked outside
  useClickOutside([dropdownContainerRef, selectContainerRef], () => {
    setShowDropdown(false);
  });

  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <div
          ref={selectContainerRef}
          className={styles.selectContainer}
          onClick={handleToggleDropdown}
        >
          {selectedOption?.label ? (
            <span>{selectedOption?.label}</span>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
          <div className={styles.rightTriangle} />
        </div>
        {showDropdown && (
          <div ref={dropdownContainerRef} className={styles.dropdownContainer}>
            {data.map((option) => (
              <div
                key={`dropdown-${option.label}`}
                onClick={() => handleSelectOption(option)}
                className={`${styles.dropdownOption} ${
                  selectedOption?.value === option.value ? styles.selected : ''
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
