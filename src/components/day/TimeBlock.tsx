"use client";

import { Text } from "ray-ui";
import {
  blockProgress,
  formatDuration,
  formatRange,
  splitTaskText,
  Task,
  TaskStatus,
} from "@/lib/taskModel";
import { StatusToggle } from "./StatusToggle";
import styles from "./TimeBlock.module.css";

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  done: "Done",
  slipped: "Slipped",
};

/** Accessible name for the status control. The visible note stays complete. */
function statusControlLabel(text: string): string {
  const line = text.split("\n", 1)[0]?.trim() || "this block";
  const short = line.length > 80 ? `${line.slice(0, 79).trimEnd()}…` : line;
  return `Status for ${short}`;
}

type TimeBlockProps = {
  task: Task;
  now: Date;
  current: boolean;
  open: boolean;
  saving: boolean;
  error: boolean;
  onToggle: () => void;
  onStatus: (status: TaskStatus) => void;
};

/**
 * Local stand-in. One planned block: time range, title or note, first step, done means.
 */
export function TimeBlock({
  task,
  now,
  current,
  open,
  saving,
  error,
  onToggle,
  onStatus,
}: TimeBlockProps) {
  const duration = formatDuration(task.start, task.end);
  const progress = current ? blockProgress(task, now) : 0;
  const panelId = `status-${task.id}`;
  const status = STATUS_LABEL[task.status];
  const parts = splitTaskText(task.text);
  const statusName = statusControlLabel(parts.title || parts.body);

  return (
    <li
      className={styles.item}
      data-status={task.status}
      data-current={current ? "true" : "false"}
    >
      <span
        className={current ? styles.dotCurrent : styles.dot}
        aria-hidden="true"
      />
      <div
        className={[
          styles.card,
          current ? styles.current : "",
          open ? styles.open : "",
          task.status === "done" ? styles.done : "",
          task.status === "slipped" ? styles.slipped : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          className={styles.hit}
          aria-expanded={open}
          aria-controls={panelId}
          aria-current={current ? "true" : undefined}
          onClick={onToggle}
        >
          <span className={styles.top}>
            <Text as="span" variant="code" className={styles.time}>
              {formatRange(task)}
            </Text>
            <Text
              as="span"
              variant="caption"
              tone={task.status === "pending" ? "muted" : "default"}
              className={styles.status}
            >
              {status}
            </Text>
          </span>
          {parts.title ? (
            <Text
              as="span"
              variant="heading-sm"
              tone={task.status === "done" ? "muted" : "default"}
              className={styles.title}
            >
              {parts.title}
            </Text>
          ) : null}
          {parts.body ? (
            <Text
              as="span"
              variant="body"
              tone={task.status === "done" ? "muted" : "default"}
              className={styles.note}
            >
              {parts.body}
            </Text>
          ) : null}
          {task.first_step ? (
            <span className={styles.meta}>
              <Text as="span" variant="caption" tone="muted">
                First step
              </Text>
              <Text as="span" variant="body">
                {task.first_step}
              </Text>
            </span>
          ) : null}
          {task.done_means ? (
            <span className={styles.meta}>
              <Text as="span" variant="caption" tone="muted">
                Done means
              </Text>
              <Text as="span" variant="body">
                {task.done_means}
              </Text>
            </span>
          ) : null}
          {duration ? (
            <Text as="span" variant="caption" tone="muted" className={styles.duration}>
              {duration}
            </Text>
          ) : null}
          {current ? (
            <span className={styles.track} aria-hidden="true">
              <span
                className={styles.fill}
                style={{ width: `${progress * 100}%` }}
              />
            </span>
          ) : null}
        </button>
        <div
          id={panelId}
          className={open ? styles.panelOpen : styles.panel}
          inert={open ? undefined : true}
        >
          <div className={styles.panelInner}>
            <StatusToggle
              value={task.status}
              onChange={onStatus}
              label={statusName}
              disabled={saving}
            />
            {error ? (
              <Text as="p" variant="caption" className={styles.error}>
                Couldn&apos;t save. Try again.
              </Text>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
