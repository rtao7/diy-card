import { Text } from "ray-ui";
import {
  blockProgress,
  formatDuration,
  formatRange,
  splitTaskText,
  Task,
} from "@/lib/taskModel";
import styles from "./TimeBlock.module.css";

type TimeBlockProps = {
  task: Task;
  now: Date;
  current: boolean;
};

/**
 * Local stand-in. One planned block: time range, title or note, first step, done means.
 */
export function TimeBlock({ task, now, current }: TimeBlockProps) {
  const duration = formatDuration(task.start, task.end);
  const progress = current ? blockProgress(task, now) : 0;
  const parts = splitTaskText(task.text);

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
          task.status === "done" ? styles.done : "",
          task.status === "slipped" ? styles.slipped : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={current ? "true" : undefined}
      >
        <span className={styles.top}>
          <Text as="span" variant="code" className={styles.time}>
            {formatRange(task)}
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
      </div>
    </li>
  );
}
