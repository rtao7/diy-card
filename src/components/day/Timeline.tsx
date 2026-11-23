"use client";

import { Text } from "ray-ui";
import {
  currentTaskId,
  formatClock,
  hasTimeRange,
  nowPlacement,
  sortTasks,
  Task,
  TaskStatus,
} from "@/lib/taskModel";
import { NowIndicator } from "./NowIndicator";
import { TimeBlock } from "./TimeBlock";
import styles from "./Timeline.module.css";

type TimelineProps = {
  tasks: Task[];
  now: Date;
  live: boolean;
  openId: string | null;
  savingId: string | null;
  errorId: string | null;
  onToggle: (id: string) => void;
  onStatus: (id: string, status: TaskStatus) => void;
};

/**
 * Local stand-in. A compact day timeline ordered by start time,
 * with the live now mark and the current block called out.
 */
export function Timeline({
  tasks,
  now,
  live,
  openId,
  savingId,
  errorId,
  onToggle,
  onStatus,
}: TimelineProps) {
  const ordered = sortTasks(tasks);
  const timed = ordered.filter(hasTimeRange);
  const untimed = ordered.filter((task) => !hasTimeRange(task));
  const placement = live ? nowPlacement(timed, now) : { kind: "empty" as const };
  const activeId = live ? currentTaskId(timed, now) : null;
  const clock = formatClock(now);

  const rows = timed.flatMap((task) => {
    const marker =
      (placement.kind === "before" || placement.kind === "inside") &&
      placement.taskId === task.id ? (
        <NowIndicator key={`now-${task.id}`} time={clock} />
      ) : null;
    return [
      marker,
      <TimeBlock
        key={task.id}
        task={task}
        now={now}
        current={task.id === activeId}
        open={openId === task.id}
        saving={savingId === task.id}
        error={errorId === task.id}
        onToggle={() => onToggle(task.id)}
        onStatus={(status) => onStatus(task.id, status)}
      />,
    ];
  });

  return (
    <div className={styles.timeline}>
      {timed.length > 0 ? (
        <ol className={styles.list}>
          {rows}
          {placement.kind === "after" ? <NowIndicator time={clock} /> : null}
        </ol>
      ) : null}
      {untimed.length > 0 ? (
        <section className={styles.anytime} aria-label="Anytime">
          <Text as="h2" variant="caption" tone="muted" className={styles.anytimeLabel}>
            Anytime
          </Text>
          <ol className={styles.list}>
            {untimed.map((task) => (
              <TimeBlock
                key={task.id}
                task={task}
                now={now}
                current={false}
                open={openId === task.id}
                saving={savingId === task.id}
                error={errorId === task.id}
                onToggle={() => onToggle(task.id)}
                onStatus={(status) => onStatus(task.id, status)}
              />
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
