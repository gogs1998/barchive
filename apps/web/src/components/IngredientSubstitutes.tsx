import { SUBSTITUTIONS } from "@/lib/substitutions";
import type { SubstituteEntry } from "@/lib/substitutions";
import styles from "./IngredientSubstitutes.module.css";

interface Props {
  ingredientName: string;
}

/**
 * IngredientSubstitutes renders a native <details>/<summary> disclosure
 * showing substitute options for a given ingredient.
 *
 * Renders nothing if no substitutes exist for the ingredient.
 * Works without JavaScript — native HTML disclosure element.
 */
export default function IngredientSubstitutes({ ingredientName }: Props) {
  // Try exact match first, then case-insensitive match
  const substitutes: SubstituteEntry[] | undefined =
    SUBSTITUTIONS[ingredientName] ??
    SUBSTITUTIONS[
      Object.keys(SUBSTITUTIONS).find(
        (k) => k.toLowerCase() === ingredientName.toLowerCase()
      ) ?? ""
    ];

  if (!substitutes || substitutes.length === 0) return null;

  return (
    <details className={styles.details}>
      <summary className={styles.summary}>
        Substitutes for {ingredientName}
      </summary>
      <ul className={styles.list} role="list">
        {substitutes.map((sub) => (
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
