"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { type BarIngredient } from "./IngredientList";
import styles from "./AddIngredientSheet.module.css";

// Canonical ingredient list (stub — replace with API)
const CANONICAL_INGREDIENTS: BarIngredient[] = [
  { id: "gin", name: "Gin", category: "Spirits", emoji: "🫙" },
  { id: "vodka", name: "Vodka", category: "Spirits", emoji: "🫙" },
  { id: "rum", name: "Rum", category: "Spirits", emoji: "🫙" },
  { id: "dark-rum", name: "Dark rum", category: "Spirits", emoji: "🫙" },
  { id: "tequila", name: "Tequila", category: "Spirits", emoji: "🫙" },
  { id: "whiskey", name: "Whiskey", category: "Spirits", emoji: "🫙" },
  { id: "bourbon", name: "Bourbon", category: "Spirits", emoji: "🫙" },
  { id: "brandy", name: "Brandy", category: "Spirits", emoji: "🫙" },
  { id: "sloe-gin", name: "Sloe gin", category: "Spirits", emoji: "🫙" },
  { id: "amaretto", name: "Amaretto", category: "Liqueurs", emoji: "🫙" },
  { id: "triple-sec", name: "Triple sec", category: "Liqueurs", emoji: "🫙" },
  { id: "kahlua", name: "Kahlúa", category: "Liqueurs", emoji: "🫙" },
  { id: "baileys", name: "Baileys", category: "Liqueurs", emoji: "🫙" },
  { id: "campari", name: "Campari", category: "Liqueurs", emoji: "🫙" },
  { id: "aperol", name: "Aperol", category: "Liqueurs", emoji: "🫙" },
  { id: "sweet-vermouth", name: "Sweet vermouth", category: "Liqueurs", emoji: "🫙" },
  { id: "dry-vermouth", name: "Dry vermouth", category: "Liqueurs", emoji: "🫙" },
  { id: "lime-juice", name: "Lime juice", category: "Mixers", emoji: "🍋" },
  { id: "lemon-juice", name: "Lemon juice", category: "Mixers", emoji: "🍋" },
  { id: "simple-syrup", name: "Simple syrup", category: "Syrups", emoji: "🍯" },
  { id: "grenadine", name: "Grenadine", category: "Syrups", emoji: "🍯" },
  { id: "ginger-syrup", name: "Ginger syrup", category: "Syrups", emoji: "🍯" },
  { id: "angostura-bitters", name: "Angostura bitters", category: "Bitters", emoji: "💧" },
  { id: "orange-bitters", name: "Orange bitters", category: "Bitters", emoji: "💧" },
  { id: "peychauds-bitters", name: "Peychaud's bitters", category: "Bitters", emoji: "💧" },
  { id: "soda-water", name: "Soda water", category: "Mixers", emoji: "💧" },
  { id: "tonic-water", name: "Tonic water", category: "Mixers", emoji: "💧" },
  { id: "ginger-beer", name: "Ginger beer", category: "Mixers", emoji: "🍺" },
  { id: "cola", name: "Cola", category: "Mixers", emoji: "🥤" },
  { id: "egg-white", name: "Egg white", category: "Other", emoji: "🥚" },
  { id: "cream", name: "Heavy cream", category: "Other", emoji: "🥛" },
  { id: "mint", name: "Mint", category: "Garnishes", emoji: "🌿" },
  { id: "lime-wedge", name: "Lime wedge", category: "Garnishes", emoji: "🍋" },
  { id: "salt", name: "Salt", category: "Garnishes", emoji: "🧂" },
  { id: "maraschino-cherry", name: "Maraschino cherry", category: "Garnishes", emoji: "🍒" },
];

const QUICK_ADD = ["Gin", "Vodka", "Rum", "Tequila", "Whiskey", "Lime juice", "Simple syrup", "Angostura bitters"];

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
              <button type="button" className={styles.customLink}>Add custom ingredient</button>
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
