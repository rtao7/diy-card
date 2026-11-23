"use client";

import type { CSSProperties } from "react";
import styles from "./SegmentedControl.module.css";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
};

/**
 * Local stand-in for a control ray-ui does not ship yet.
 * A pill of mutually exclusive options with a sliding selection.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const style = {
    "--count": options.length,
    "--index": index,
  } as CSSProperties;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={styles.control}
      style={style}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={styles.option}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
