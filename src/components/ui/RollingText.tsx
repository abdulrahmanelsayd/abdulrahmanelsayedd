import { RollingLabel } from "./RollingLabel";
import styles from "./RollingText.module.css";

export function RollingText({ label }: { label: string }) {
  return <span className={styles.viewport} data-roll-viewport><RollingLabel label={label} /></span>;
}
