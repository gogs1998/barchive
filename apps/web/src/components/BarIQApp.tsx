"use client";

/**
 * BarIQ App — client-side shell that routes between Library, Bar Mode,
 * Build View, and management modals. Mirrors the standalone BarIQ.html app.
 *
 * Used on the /bar route as a full-screen experience.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { COCKTAILS, type Cocktail } from "@/lib/cocktails";
import { THEMES, DEFAULT_THEME, type Theme, type ThemeKey } from "@/lib/themes";
import { BarMode } from "@/components/BarMode";
import { BuildView } from "@/components/BuildView";
import { EightySixManager, CustomizeBarMode } from "@/components/BarModeModals";

type View = "library" | "barmode" | "build" | "customize" | "eightysix";

const DEFAULT_BAR_IDS = COCKTAILS.slice(0, 10).map((c) => c.id);

function useLocalStorage<T>(key: string, init: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(init);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setVal(JSON.parse(stored));
    } catch {}
  }, [key]);
  const save = useCallback(
    (v: T) => {
      setVal(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
    },
    [key]
  );
  return [val, save];
}

export function BarIQApp() {
  const [view, setView] = useState<View>("library");
  const [activeCocktail, setActiveCocktail] = useState<Cocktail | null>(null);
  const [themeKey, setThemeKey] = useLocalStorage<ThemeKey>("bariq.theme", "dark");
  const [eightySix, setEightySix] = useLocalStorage<string[]>("bariq.86", []);
  const [barModeIds, setBarModeIds] = useLocalStorage<string[]>(
    "bariq.barModeIds",
    DEFAULT_BAR_IDS
  );
  const [orientation, setOrientation] = useLocalStorage<"landscape" | "portrait">(
    "bariq.orientation",
    "landscape"
  );
  const [multiplier, setMultiplier] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const theme: Theme = THEMES[themeKey] ?? DEFAULT_THEME;

  const barModeCocktails = barModeIds
    .map((id) => COCKTAILS.find((c) => c.id === id))
    .filter(Boolean) as Cocktail[];

  const categories = [...new Set(COCKTAILS.map((c) => c.category))].sort();

  let filtered = COCKTAILS;
  if (categoryFilter) filtered = filtered.filter((c) => c.category === categoryFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q)) ||
        c.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }

  // Keyboard shortcut: T to cycle themes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "t" && view === "library") {
        const keys = Object.keys(THEMES) as ThemeKey[];
        const idx = keys.indexOf(themeKey);
        setThemeKey(keys[(idx + 1) % keys.length]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, themeKey, setThemeKey]);

  if (view === "barmode") {
    return (
      <BarMode
        theme={theme}
        cocktails={barModeCocktails}
        allCocktails={COCKTAILS}
        orientation={orientation}
        eightySix={eightySix}
        onOpen={(c) => {
          setActiveCocktail(c);
          setView("build");
        }}
        onExit={() => setView("library")}
        onSetOrientation={setOrientation}
      />
    );
  }

  if (view === "build" && activeCocktail) {
    return (
      <BuildView
        cocktail={activeCocktail}
        theme={theme}
        multiplier={multiplier}
        setMultiplier={setMultiplier}
        onClose={() => setView(activeCocktail ? "barmode" : "library")}
        eightySix={eightySix}
      />
    );
  }

  if (view === "customize") {
    return (
      <CustomizeBarMode
        theme={theme}
        allCocktails={COCKTAILS}
        barModeIds={barModeIds}
        onSave={(ids) => {
          setBarModeIds(ids);
          setView("barmode");
        }}
        onCancel={() => setView("library")}
      />
    );
  }

  // Library view
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: theme.bg,
        color: theme.text,
        fontFamily: theme.ui,
      }}
    >
      {/* Library header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
          borderBottom: `1px solid ${theme.border}`,
          position: "sticky",
          top: 0,
          background: theme.bg,
          zIndex: 50,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            style={{
              fontSize: 11,
              color: theme.muted,
              textDecoration: "none",
              fontFamily: theme.mono,
              letterSpacing: 1,
              textTransform: "uppercase",
              opacity: 0.7,
            }}
            aria-label="Exit Bar Mode, return to home"
          >
            ← Home
          </Link>
          <h1
            style={{
              fontFamily: theme.display,
              fontSize: 26,
              fontStyle: "italic",
              color: theme.accent,
              margin: 0,
              lineHeight: 1,
            }}
          >
            BarIQ
          </h1>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cocktails, spirits, tags…"
          style={{
            flex: 1,
            maxWidth: 480,
            padding: "9px 16px",
            background: theme.surface,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Theme toggle */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              padding: 2,
            }}
          >
            {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setThemeKey(k)}
                title={THEMES[k].name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  background:
                    themeKey === k ? theme.accent : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                  color: themeKey === k ? theme.bg : theme.muted,
                  fontFamily: theme.mono,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {k[0].toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => setView("eightysix")}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              background: eightySix.length > 0 ? "#E0633F22" : theme.surface,
              color: eightySix.length > 0 ? "#E89B7E" : theme.muted,
              border: `1px solid ${eightySix.length > 0 ? "#E0633F66" : theme.border}`,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: theme.mono,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            86 List{eightySix.length > 0 ? ` (${eightySix.length})` : ""}
          </button>

          <button
            onClick={() => setView("customize")}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              background: theme.surface,
              color: theme.muted,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: theme.mono,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Customize
          </button>

          <button
            onClick={() => setView("barmode")}
            style={{
              padding: "8px 18px",
              fontSize: 12,
              background: theme.accent,
              color: theme.bg,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: theme.mono,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Bar Mode
          </button>
        </div>
      </header>

      {/* Category tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "14px 28px",
          overflowX: "auto",
          borderBottom: `1px solid ${theme.border}`,
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={() => setCategoryFilter("")}
          style={{
            padding: "6px 14px",
            fontSize: 11,
            fontFamily: theme.mono,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            background: !categoryFilter ? theme.accent : "transparent",
            color: !categoryFilter ? theme.bg : theme.muted,
            border: `1px solid ${!categoryFilter ? theme.accent : theme.border}`,
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setCategoryFilter(categoryFilter === cat ? "" : cat)
            }
            style={{
              padding: "6px 14px",
              fontSize: 11,
              fontFamily: theme.mono,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              background:
                categoryFilter === cat ? theme.accent : "transparent",
              color: categoryFilter === cat ? theme.bg : theme.muted,
              border: `1px solid ${categoryFilter === cat ? theme.accent : theme.border}`,
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cocktail grid */}
      <div
        style={{
          padding: "24px 28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((c) => {
          const out = c.ingredients.some((i) => eightySix.includes(i.name));
          return (
            <LibraryCard
              key={c.id}
              cocktail={c}
              theme={theme}
              eightySixed={out}
              onBuild={() => {
                setActiveCocktail(c);
                setView("build");
              }}
            />
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              padding: "80px 0",
              color: theme.muted,
              fontFamily: theme.mono,
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            No cocktails match your search
          </div>
        )}
      </div>

      {/* 86 List modal */}
      {view === "eightysix" && (
        <EightySixManager
          theme={theme}
          eightySix={eightySix}
          setEightySix={setEightySix}
          allCocktails={COCKTAILS}
          onClose={() => setView("library")}
        />
      )}
    </div>
  );
}

function LibraryCard({
  cocktail,
  theme,
  eightySixed,
  onBuild,
}: {
  cocktail: Cocktail;
  theme: Theme;
  eightySixed: boolean;
  onBuild: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
        background: theme.surface,
        opacity: eightySixed ? 0.6 : 1,
        transition: "box-shadow 200ms, transform 200ms",
        boxShadow: hover
          ? `0 12px 30px rgba(0,0,0,0.4), 0 0 0 1px ${theme.accent}40`
          : "0 2px 8px rgba(0,0,0,0.2)",
        transform: hover ? "translateY(-2px)" : "none",
      }}
    >
      {/* Photo */}
      <div
        style={{
          height: 180,
          backgroundImage: `url(${cocktail.img})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          filter: eightySixed ? "grayscale(0.6)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, transparent 50%, ${theme.surface}F0)`,
          }}
        />
        {eightySixed && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "3px 8px",
              background: "#E0633F88",
              color: "#FFD0B0",
              fontSize: 9,
              letterSpacing: 2,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              borderRadius: 4,
            }}
          >
            86&apos;d
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "3px 8px",
            background: "rgba(0,0,0,0.6)",
            color: theme.accent,
            fontSize: 10,
            letterSpacing: 1,
            fontFamily: theme.mono,
            borderRadius: 4,
          }}
        >
          {cocktail.abv}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 2.5,
            color: theme.muted,
            fontFamily: theme.mono,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {cocktail.category} · {cocktail.glass}
        </div>
        <div
          style={{
            fontFamily: theme.display,
            fontStyle: "italic",
            fontSize: 22,
            color: theme.text,
            letterSpacing: -0.3,
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          {cocktail.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: theme.muted,
            lineHeight: 1.4,
            marginBottom: 14,
          }}
        >
          {cocktail.ingredients
            .slice(0, 3)
            .map((i) => i.name)
            .join(", ")}
          {cocktail.ingredients.length > 3 &&
            ` +${cocktail.ingredients.length - 3} more`}
        </div>
        <button
          onClick={onBuild}
          style={{
            width: "100%",
            padding: "9px 0",
            background: hover ? theme.accent : "transparent",
            color: hover ? theme.bg : theme.accent,
            border: `1px solid ${theme.accent}`,
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: theme.mono,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 600,
            transition: "background 200ms, color 200ms",
          }}
        >
          Build →
        </button>
      </div>
    </div>
  );
}
