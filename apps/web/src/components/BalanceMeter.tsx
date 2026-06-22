// src/components/BalanceMeter.tsx
import type { BalanceScores } from "@/lib/cocktailiq/types";
import styles from "./BalanceMeter.module.css";

const DIMENSIONS = [
  ["Diversity", "diversity"],
  ["Proportions", "proportions"],
  ["Chemistry", "chemistry"],
  ["Harmony", "harmony"],
] as const;

/** Presentational 4-dimension balance meter. Server component. */
export function BalanceMeter({ scores }: { scores: BalanceScores }) {
  return (
    <div className={styles.meter}>
      <div className={styles.overall}>
        <span className={styles.overallNum}>{Math.round(scores.overall)}</span>
        <span className={styles.rating}>{scores.rating}</span>
      </div>

      <ul className={styles.bars} role="list">
        {DIMENSIONS.map(([label, key]) => {
          const value = Math.round(scores[key]);
          return (
            <li key={key} className={styles.bar}>
              <span className={styles.barLabel}>{label}</span>
              <span className={styles.track}>
                <span className={styles.fill} style={{ width: `${value}%` }} />
              </span>
              <span className={styles.barVal}>{value}</span>
            </li>
          );
        })}
      </ul>

      {scores.suggestions.length > 0 && (
        <ul className={styles.suggestions}>
          {scores.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
