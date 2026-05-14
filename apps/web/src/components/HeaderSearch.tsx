"use client";

import { useRef, useState, useId, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchCocktails, type Cocktail } from "@/lib/cocktails";
import styles from "./HeaderSearch.module.css";

/** Debounce helper */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function HeaderSearch() {
  const router = useRouter();
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** Mobile: whether the input is expanded */
  const [expanded, setExpanded] = useState(false);

  const debouncedQuery = useDebounce(query, 150);

  const results: Cocktail[] = debouncedQuery.trim().length >= 1
    ? searchCocktails(debouncedQuery).slice(0, 8)
    : [];

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const showResults = open && (results.length > 0 || debouncedQuery.trim().length >= 1);

  const navigate = useCallback(
    (cocktail: Cocktail) => {
      router.push(`/cocktails/${cocktail.slug}`);
      setQuery("");
      setOpen(false);
      setExpanded(false);
    },
    [router]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        navigate(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleMobileToggle() {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const activeDescendant =
    activeIndex >= 0 && results[activeIndex]
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${expanded ? styles.containerExpanded : ""}`}
      data-testid="header-search"
    >
      {/* Mobile toggle: magnifier icon button */}
      <button
        type="button"
        className={styles.mobileToggle}
        aria-label="Open search"
        aria-expanded={expanded}
        onClick={handleMobileToggle}
        tabIndex={expanded ? -1 : 0}
      >
        <MagnifierIcon />
      </button>

      {/* Search input area */}
      <div
        className={`${styles.inputWrapper} ${expanded ? styles.inputWrapperExpanded : ""}`}
        aria-hidden={!expanded ? undefined : undefined}
      >
        {/* Magnifier icon inside the input */}
        <span className={styles.inputIcon} aria-hidden="true">
          <MagnifierIcon />
        </span>

        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          value={query}
          placeholder="Search cocktails…"
          aria-label="Search cocktails"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-expanded={showResults}
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setOpen(false);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
          >
            <ClearIcon />
          </button>
        )}

        {/* Close button on mobile expanded state */}
        <button
          type="button"
          className={styles.mobileClose}
          aria-label="Close search"
          onClick={() => {
            setExpanded(false);
            setOpen(false);
            setQuery("");
          }}
        >
          ✕
        </button>
      </div>

      {/* Results dropdown */}
      {showResults && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          aria-live="polite"
          className={styles.listbox}
        >
          {results.length === 0 ? (
            <li className={styles.emptyState} role="option" aria-selected="false">
              Try <em>Negroni</em> or <em>Daiquiri</em>
            </li>
          ) : (
            results.map((cocktail, i) => (
              <li
                key={cocktail.id}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`${styles.option} ${i === activeIndex ? styles.optionActive : ""}`}
                onMouseDown={(e) => {
                  // Prevent blur before click registers
                  e.preventDefault();
                  navigate(cocktail);
                }}
              >
                <span className={styles.optionName}>{cocktail.name}</span>
                <span className={styles.optionMeta}>
                  <span className={styles.optionCategory}>{cocktail.category}</span>
                  <span className={styles.optionTime}>{cocktail.time}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function MagnifierIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
