import { SUBSTITUTIONS } from "@/lib/substitutions";
import type { SubstituteEntry } from "@/lib/substitutions";
import styles from "./IngredientSubstitutes.module.css";

interface Props {
  ingredientName: string;
  /** Precomputed substitutes (build-time). Falls back to the curated map if omitted. */
  substitutes?: SubstituteEntry[];
}

export default function IngredientSubstitutes({ ingredientName, substitutes }: Props) {
  const resolved: SubstituteEntry[] | undefined =
    substitutes ??
    SUBSTITUTIONS[ingredientName] ??
    SUBSTITUTIONS[
      Object.keys(SUBSTITUTIONS).find(
        (k) => k.toLowerCase() === ingredientName.toLowerCase()
      ) ?? ""
    ];

  if (!resolved || resolved.length === 0) return null;

  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        Substitutes for {ingredientName}
      </summary>
      <ul className={styles.list} role="list">
        {resolved.map((sub) => (
          <li key={sub.name} className={styles.item}>
            <span className={styles.subName}>{sub.name}</span>
            <span className={styles.note}>{sub.note}</span>
            <span
              className={`${styles.badge} ${styles[`parity_${sub.parity}`]}`}
              aria-label={`Parity: ${sub.parity}`}
            >
              {sub.parity}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
