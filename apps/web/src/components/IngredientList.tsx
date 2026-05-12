"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { UndoToast } from "./UndoToast";
import styles from "./IngredientList.module.css";

export interface BarIngredient {
  id: string;
  name: string;
  category: string;
  emoji?: string;
}

interface Props {
  ingredients: BarIngredient[];
}

interface PendingRemoval {
  ingredient: BarIngredient;
}

export function IngredientList({ ingredients }: Props) {
  const { removeBarIngredient, addBarIngredient } = useAuth();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

  const handleRemove = useCallback((ingredient: BarIngredient) => {
    // Animate out
    setRemovingIds((prev) => new Set([...prev, ingredient.id]));
    setTimeout(() => {
      removeBarIngredient(ingredient.id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(ingredient.id);
        return next;
      });
    }, 250);
    setPendingRemoval({ ingredient });
  }, [removeBarIngredient]);

  const handleUndo = useCallback(() => {
    if (pendingRemoval) {
      addBarIngredient(pendingRemoval.ingredient.id);
    }
    setPendingRemoval(null);
  }, [pendingRemoval, addBarIngredient]);

  // Group by category
  const grouped = ingredients.reduce<Record<string, BarIngredient[]>>((acc, ing) => {
    if (!acc[ing.category]) acc[ing.category] = [];
    acc[ing.category].push(ing);
    return acc;
  }, {});

  if (ingredients.length === 0) return null;

  return (
    <>
      <div className={styles.list}>
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className={styles.group}>
            <h3 className={styles.categoryHeader}>{category.toUpperCase()}</h3>
            <ul className={styles.items} role="list">
              {items.map((ing) => (
                <li
                  key={ing.id}
                  className={`${styles.item} ${removingIds.has(ing.id) ? styles.removing : ""}`}
                >
                  <span className={styles.emoji} aria-hidden="true">{ing.emoji ?? "🫙"}</span>
                  <span className={styles.name}>{ing.name}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemove(ing)}
                    aria-label={`Remove ${ing.name} from your bar`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {pendingRemoval && (
        <UndoToast
          message={`${pendingRemoval.ingredient.name} removed.`}
          onUndo={handleUndo}
          onDismiss={() => setPendingRemoval(null)}
        />
      )}
    </>
  );
}
