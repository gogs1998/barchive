"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { type BarIngredient } from "./IngredientList";
import { STARTER_INGREDIENTS } from "@/lib/onboarding-ingredients";
import { slugify } from "@/lib/slug";
import styles from "./AddIngredientSheet.module.css";

const CATEGORY_EMOJI: Record<string, string> = {
  Spirits: "🫙",
  Liqueurs: "🫙",
  "Mixers & Soda": "💧",
  "Citrus & Juice": "🍋",
  "Syrups & Sweeteners": "🍯",
  "Bitters & Garnish": "🌿",
};

// The starter vocabulary: the same names the recipes use, so anything added
// here counts towards "What Can I Make?". Ids are slugs, which the Worker
// resolves via ingredients.slug.
const CANONICAL_INGREDIENTS: BarIngredient[] = STARTER_INGREDIENTS.map((s) => ({
  id: slugify(s.name),
  name: s.name,
  category: s.category,
  emoji: CATEGORY_EMOJI[s.category] ?? "🫙",
}));

const QUICK_ADD = [
  "Gin",
  "Vodka",
  "Light White Rum",
  "Blanco Tequila",
  "Bourbon Whiskey",
  "Lime Juice",
  "Sugar Syrup (2:1)",
  "Aromatic Bitters",
];

const CATEGORIES = ["All", ...Array.from(new Set(CANONICAL_INGREDIENTS.map((i) => i.category)))];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddIngredientSheet({ open, onClose }: Props) {
  const { barIngredients, addBarIngredient } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setCategory("All");
    }
  }, [open]);

  // Filter
  const filtered = CANONICAL_INGREDIENTS.filter((ing) => {
    const matchesCategory = category === "All" || ing.category === category;
    const matchesQuery = !query || ing.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handleAdd = useCallback((ing: BarIngredient) => {
    if (barIngredients.includes(ing.id)) return;
    addBarIngredient(ing.id);
    setAddedIds((prev) => new Set([...prev, ing.id]));
    // Reset "Added" label after 1.5s
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(ing.id);
        return next;
      });
    }, 1500);
  }, [barIngredients, addBarIngredient]);

  const isInBar = (id: string) => barIngredients.includes(id);
  const justAdded = (id: string) => addedIds.has(id);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-label="Add ingredients"
        aria-modal="true"
        className={styles.sheet}
      >
        {/* Drag handle */}
        <div className={styles.handle} aria-hidden="true" />

        {/* Search */}
        <div className={styles.searchWrap}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={styles.searchIcon}>
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search ingredients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search ingredients"
          />
        </div>

        {/* Category filter chips */}
        <div className={styles.chips} role="group" aria-label="Filter by category">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.chip} ${category === cat ? styles.chipActive : ""}`}
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick add (only when no query) */}
        {!query && category === "All" && (
          <div className={styles.quickSection}>
            <p className={styles.sectionLabel}>Quick add</p>
            <div className={styles.quickChips}>
              {QUICK_ADD.map((name) => {
                const ing = CANONICAL_INGREDIENTS.find((i) => i.name === name);
                if (!ing) return null;
                const inBar = isInBar(ing.id);
                return (
                  <button
                    key={ing.id}
                    type="button"
                    className={`${styles.quickChip} ${inBar ? styles.quickChipInBar : ""}`}
                    onClick={() => handleAdd(ing)}
                    disabled={inBar}
                    aria-label={inBar ? `${name} is already in your bar` : `Quick add ${name}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results */}
        <ul className={styles.results} role="list">
          {filtered.length === 0 ? (
            <li className={styles.noResults}>
              <span>No ingredients found.</span>
              <button
                type="button"
                className={styles.customLink}
                onClick={() => {
                  // TODO: open custom ingredient creation flow (BAR-43)
                  console.log("[BarIQ] Add custom ingredient clicked — feature coming soon");
                }}
              >
                Add custom ingredient
              </button>
            </li>
          ) : (
            filtered.map((ing) => {
              const inBar = isInBar(ing.id);
              const added = justAdded(ing.id);
              return (
                <li key={ing.id} className={styles.resultItem}>
                  <span className={styles.resultEmoji} aria-hidden="true">{ing.emoji}</span>
                  <span className={styles.resultName}>{ing.name}</span>
                  <button
                    type="button"
                    className={`${styles.addBtn} ${inBar ? styles.addBtnInBar : ""}`}
                    onClick={() => handleAdd(ing)}
                    disabled={inBar}
                    aria-label={inBar ? `${ing.name} is already in your bar` : `Add ${ing.name}`}
                  >
                    {inBar ? (added ? "Added ✓" : "In your bar ✓") : "Add +"}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </>
  );
}
