"use client";

import { useMemo, useState } from "react";
import styles from "./IngredientPicker.module.css";

export interface IngredientPickerItem {
  name: string;
  category: string;
}

interface IngredientPickerProps {
  items: IngredientPickerItem[];
  /** Selected ingredient names. */
  selected: string[];
  onToggle: (name: string) => void;
  searchPlaceholder?: string;
}

/**
 * Reusable grouped, searchable multi-select. Pure presentational — the parent
 * owns the selection state and is notified via `onToggle`. Mirrors the
 * cocktails filter-chip visual pattern.
 */
export function IngredientPicker({
  items,
  selected,
  onToggle,
  searchPlaceholder = "Search ingredients…",
}: IngredientPickerProps) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected]
  );

  // Group items by category, preserving first-seen order.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, IngredientPickerItem[]>();
    for (const item of items) {
      if (q && !item.name.toLowerCase().includes(q)) continue;
      const list = map.get(item.category);
      if (list) list.push(item);
      else map.set(item.category, [item]);
    }
    return [...map.entries()];
  }, [items, query]);

  return (
    <div className={styles.picker}>
      <input
        type="search"
        role="searchbox"
        className={styles.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label="Search ingredients"
      />

      {groups.length === 0 ? (
        <p className={styles.empty} role="status">
          No ingredients match “{query}”.
        </p>
      ) : (
        groups.map(([category, list]) => {
          const count = list.filter((i) => selectedSet.has(i.name.toLowerCase()))
            .length;
          return (
            <section key={category} className={styles.group}>
              <header className={styles.groupHeader}>
                <span className={styles.groupTitle}>{category}</span>
                <span className={styles.groupCount}>
                  {count} / {list.length}
                </span>
              </header>
              <div className={styles.chips} role="group" aria-label={category}>
                {list.map((item) => {
                  const isSelected = selectedSet.has(item.name.toLowerCase());
                  return (
                    <button
                      key={item.name}
                      type="button"
                      className={`${styles.chip} ${
                        isSelected ? styles.chipActive : ""
                      }`}
                      onClick={() => onToggle(item.name)}
                      aria-pressed={isSelected}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
