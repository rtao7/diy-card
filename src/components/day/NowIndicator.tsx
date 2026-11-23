import { Text } from "ray-ui";
import styles from "./NowIndicator.module.css";

type NowIndicatorProps = {
  time: string;
};

/**
 * Local stand-in. The live "now" mark on the day timeline.
 * `time` is HH:MM and updates as the clock moves.
 */
export function NowIndicator({ time }: NowIndicatorProps) {
  return (
    <li className={styles.now}>
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.mark}>
        <span className={styles.line} aria-hidden="true" />
        <Text as="span" variant="caption" className={styles.label}>
          Now {time}
        </Text>
      </div>
    </li>
  );
}
