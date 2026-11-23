"use client";

import { TaskStatus } from "@/lib/types";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "done", label: "Done" },
  { value: "slipped", label: "Slipped" },
];

type StatusToggleProps = {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  label: string;
  disabled?: boolean;
};

/**
 * Local stand-in. Three-way status for a block: pending, done, or slipped.
 */
export function StatusToggle({
  value,
  onChange,
  label,
  disabled,
}: StatusToggleProps) {
  return (
    <SegmentedControl
      value={value}
      options={OPTIONS}
      onChange={onChange}
      ariaLabel={label}
      disabled={disabled}
    />
  );
}
