"use client";

import { useState, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { CocktailCard } from "@/components/CocktailCard";
import type { Cocktail } from "@/lib/api";
import styles from "./CocktailsClient.module.css";

interface CocktailsClientProps {
  initialCocktails: Cocktail[];
  categories: string[];
  glasses: string[];
}

export function CocktailsClient({
  initialCocktails,
  categories,
  glasses,
}: CocktailsClientProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeGlass, setActiveGlass] = useState("All");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return initialCocktails.filter((c) => {
      if (q) {
        const nameMatch = c.name.toLowerCase().includes(q);
        const catMatch = c.category.toLowerCase().includes(q);
        const ingMatch = c.ingredients.some((i) =>
          i.name.toLowerCase().includes(q)
        );
        const tagMatch = c.tags.some((t) => t.includes(q));
        if (!nameMatch && !catMatch && !ingMatch && !tagMatch) return false;
      }
      if (activeCategory !== "All" && c.category !== activeCategory)
        return false;
      if (activeGlass !== "All" && c.glass !== activeGlass) return false;
      return true;
    });
  }, [query, activeCategory, activeGlass, initialCocktails]);

  return (
    <div>
      {/* Page heading */}
      <div className={styles.heading}>
        <h1 className={styles.title}>Cocktails</h1>
        <span className={styles.count} aria-live="polite" aria-atomic="true">
          {filtered.length} / {initialCocktails.length}
        </span>
      </div>

      {/* Search + filters */}
      <div className={styles.controls}>
        <SearchBar value={query} onChange={setQuery} />

        <div className={styles.filters} role="group" aria-label="Filter by spirit">
          <FilterChips
            label="Spirit"
            options={["All", ...categories]}
            value={activeCategory}
            onChange={setActiveCategory}
          />
        </div>

        <div className={styles.filters} role="group" aria-label="Filter by glass">
          <FilterChips
            label="Glass"
            options={["All", ...glasses]}
            value={activeGlass}
            onChange={setActiveGlass}
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className={styles.empty} role="status">
          <p>No cocktails match your search. Try a different query or filter.</p>
          <button
            className={styles.resetBtn}
            onClick={() => {
              setQuery("");
              setActiveCategory("All");
              setActiveGlass("All");
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div
          className={styles.grid}
          role="list"
          aria-label={`${filtered.length} cocktail results`}
        >
          {filtered.map((cocktail) => (
            <div key={cocktail.id} role="listitem">
              <CocktailCard cocktail={cocktail} showIngredients />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.chips}>
      <span className={styles.chipsLabel}>{label}:</span>
      {options.map((opt) => (
        <button
          key={opt}
          className={`${styles.chip} ${value === opt ? styles.chipActive : ""}`}
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
