"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";
import { CocktailCard } from "@/components/CocktailCard";
import { useAuth } from "@/lib/auth-context";
import { isMakeable as isMakeableHelper } from "@/lib/makeable";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialise filters from URL params so deep-links like ?category=gin work.
  // Match case-insensitively so ?category=gin matches stored "Gin".
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategoryState] = useState(() => {
    const cat = searchParams.get("category") ?? "";
    if (!cat) return "All";
    const matched = categories.find(
      (c) => c.toLowerCase() === cat.toLowerCase()
    );
    return matched ?? "All";
  });
  const [activeGlass, setActiveGlass] = useState("All");
  // Initialise from ?make=1 so deep-links from onboarding pre-enable the filter.
  const [canMakeFilter, setCanMakeFilter] = useState(
    () => searchParams.get("make") === "1"
  );

  // Keep URL in sync when category changes
  const setActiveCategory = useCallback(
    (cat: string) => {
      setActiveCategoryState(cat);
      const params = new URLSearchParams(searchParams.toString());
      if (cat === "All") {
        params.delete("category");
      } else {
        params.set("category", cat);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const { barIngredientData } = useAuth();

  // Build a lowercase name set from bar for matching against cocktail ingredients
  const barIngredientNames = useMemo(
    () => new Set(barIngredientData.map((i) => i.name.toLowerCase())),
    [barIngredientData]
  );

  const isMakeable = useCallback(
    (cocktail: Cocktail) => isMakeableHelper(cocktail, barIngredientNames),
    [barIngredientNames]
  );

  // Guard against trapping the user with an empty bar: the "What Can I Make?"
  // toggle is hidden when the bar is empty, so if ?make=1 (or a stale toggle)
  // left it on with no ingredients it would hide every cocktail with no way to
  // turn it back off. Force it off whenever the bar is empty.
  useEffect(() => {
    if (barIngredientData.length === 0) setCanMakeFilter(false);
  }, [barIngredientData.length]);

  // Render the grid in pages so a multi-thousand-cocktail result stays fast.
  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
      if (canMakeFilter && !isMakeable(c)) return false;
      return true;
    });
  }, [query, activeCategory, activeGlass, canMakeFilter, isMakeable, initialCocktails]);

  // Reset paging whenever the result set changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeCategory, activeGlass, canMakeFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

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

        {/* What Can I Make? toggle — shown whenever the bar has ingredients
            (works for guests with a localStorage bar, not just logged-in users) */}
        {barIngredientData.length > 0 && (
          <button
            type="button"
            className={`${styles.canMakeBtn} ${canMakeFilter ? styles.canMakeBtnActive : ""}`}
            onClick={() => setCanMakeFilter((v) => !v)}
            aria-pressed={canMakeFilter}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 4h14l-2 9a4 4 0 0 1-4 3h-2a4 4 0 0 1-4-3L5 4z" />
              <path d="M12 16v4M9 20h6" />
            </svg>
            What Can I Make?
            {canMakeFilter && barIngredientData.length > 0 && (
              <span className={styles.canMakeBadge}>
                {filtered.length}
              </span>
            )}
          </button>
        )}

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
          <p>
            {canMakeFilter && barIngredientData.length === 0
              ? "Add ingredients to My Bar to see what you can make."
              : "No cocktails match your search. Try a different query or filter."}
          </p>
          <button
            className={styles.resetBtn}
            onClick={() => {
              setQuery("");
              setActiveCategory("All");
              setActiveGlass("All");
              setCanMakeFilter(false);
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div
            className={styles.grid}
            role="list"
            aria-label={`${filtered.length} cocktail results`}
          >
            {visible.map((cocktail) => (
              <div key={cocktail.id} role="listitem">
                <CocktailCard
                  cocktail={cocktail}
                  showIngredients
                  makeable={barIngredientData.length > 0 && isMakeable(cocktail)}
                />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className={styles.loadMoreRow}>
              <button
                type="button"
                className={styles.loadMoreBtn}
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              >
                Load more ({filtered.length - visibleCount} more)
              </button>
            </div>
          )}
        </>
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

