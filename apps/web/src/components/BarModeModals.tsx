"use client";

import { useState } from "react";
import type { Cocktail } from "@/lib/cocktails";
import type { Theme } from "@/lib/themes";

interface EightySixManagerProps {
  theme: Theme;
  eightySix: string[];
  setEightySix: (list: string[]) => void;
  allCocktails: Cocktail[];
  onClose: () => void;
}

export function EightySixManager({
  theme,
  eightySix,
  setEightySix,
  allCocktails,
  onClose,
}: EightySixManagerProps) {
  const allIngredients = [
    ...new Set(allCocktails.flatMap((c) => c.ingredients.map((i) => i.name))),
  ].sort();
  const [search, setSearch] = useState("");
  const filtered = allIngredients.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (n: string) => {
    if (eightySix.includes(n)) setEightySix(eightySix.filter((x) => x !== n));
    else setEightySix([...eightySix, n]);
  };

  const affectedCount = (n: string) =>
    allCocktails.filter((c) => c.ingredients.some((i) => i.name === n)).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          width: "80%",
          maxWidth: 720,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px",
            borderBottom: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: theme.display,
                fontStyle: "italic",
                fontSize: 26,
                color: theme.text,
              }}
            >
              86 List
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                color: theme.muted,
                fontFamily: theme.mono,
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              {eightySix.length} ingredients out · affects tiles in Bar Mode
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "transparent",
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
            }}
          >
            Done
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            padding: "14px 28px",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            style={{
              width: "100%",
              padding: "10px 14px",
              background: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}>
          {filtered.map((n) => {
            const out = eightySix.includes(n);
            return (
              <div
                key={n}
                onClick={() => toggle(n)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: out ? "#E0633F22" : "transparent",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `1.5px solid ${out ? "#E0633F" : theme.border}`,
                    background: out ? "#E0633F" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: theme.bg,
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {out ? "×" : ""}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontFamily: theme.display,
                    fontStyle: "italic",
                    fontSize: 17,
                    color: theme.text,
                    textDecoration: out ? "line-through" : "none",
                  }}
                >
                  {n}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: theme.muted,
                    fontFamily: theme.mono,
                    textTransform: "uppercase",
                  }}
                >
                  {affectedCount(n)} drinks
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CustomizeBarModeProps {
  theme: Theme;
  allCocktails: Cocktail[];
  barModeIds: string[];
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}

export function CustomizeBarMode({
  theme,
  allCocktails,
  barModeIds,
  onSave,
  onCancel,
}: CustomizeBarModeProps) {
  const [selected, setSelected] = useState<string[]>(barModeIds);

  const toggle = (id: string) => {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else if (selected.length < 10) setSelected([...selected, id]);
  };

  const move = (id: string, dir: number) => {
    const idx = selected.indexOf(id);
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= selected.length) return;
    const next = [...selected];
    [next[idx], next[ni]] = [next[ni], next[idx]];
    setSelected(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        fontFamily: theme.ui,
        zIndex: 250,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 40px",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: theme.display,
              fontStyle: "italic",
              fontSize: 28,
              color: theme.text,
              letterSpacing: -0.5,
            }}
          >
            Customize Bar Mode
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: theme.muted,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Pick 10 · {selected.length}/10 selected
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 16px",
              fontSize: 13,
              background: theme.surface,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={selected.length !== 10}
            style={{
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 600,
              background:
                selected.length === 10 ? theme.accent : theme.surface,
              color: selected.length === 10 ? theme.bg : theme.muted,
              border: `1px solid ${selected.length === 10 ? theme.accent : theme.border}`,
              borderRadius: 8,
              cursor: selected.length === 10 ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            Save Bar Mode
          </button>
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          overflow: "hidden",
        }}
      >
        {/* Pool grid */}
        <div style={{ overflowY: "auto", padding: "24px 28px 40px 40px" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: theme.muted,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Library — tap to add
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {allCocktails.map((c) => {
              const isPicked = selected.includes(c.id);
              const pos = selected.indexOf(c.id) + 1;
              return (
                <div
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 10,
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    border: `2px solid ${isPicked ? theme.accent : theme.border}`,
                    opacity:
                      !isPicked && selected.length >= 10 ? 0.4 : 1,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${c.img})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(180deg, transparent 40%, ${theme.bg}F0)`,
                    }}
                  />
                  {isPicked && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        background: theme.accent,
                        color: theme.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: theme.mono,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {pos}
                    </div>
                  )}
                  <div
                    style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}
                  >
                    <div
                      style={{
                        fontFamily: theme.display,
                        fontStyle: "italic",
                        fontSize: 14,
                        color: theme.text,
                        lineHeight: 1,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: theme.muted,
                        fontFamily: theme.mono,
                        textTransform: "uppercase",
                        marginTop: 4,
                      }}
                    >
                      {c.category}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected order panel */}
        <div
          style={{
            borderLeft: `1px solid ${theme.border}`,
            background: theme.surface,
            padding: "24px 28px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: theme.muted,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Bar Mode order
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selected.map((id, i) => {
              const c = allCocktails.find((x) => x.id === id);
              if (!c) return null;
              return (
                <div
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: theme.bg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      background: theme.accent,
                      color: theme.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: theme.mono,
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: 4,
                      backgroundImage: `url(${c.img})`,
                      backgroundSize: "cover",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: theme.display,
                        fontStyle: "italic",
                        fontSize: 15,
                        color: theme.text,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: theme.muted,
                        fontFamily: theme.mono,
                        textTransform: "uppercase",
                        marginTop: 1,
                      }}
                    >
                      {c.category}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button
                      onClick={() => move(id, -1)}
                      style={{
                        width: 22,
                        height: 18,
                        fontSize: 9,
                        color: theme.muted,
                        background: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 3,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(id, 1)}
                      style={{
                        width: 22,
                        height: 18,
                        fontSize: 9,
                        color: theme.muted,
                        background: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 3,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    onClick={() => toggle(id)}
                    style={{
                      padding: 6,
                      background: "transparent",
                      color: theme.muted,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {Array.from({ length: 10 - selected.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 10px",
                  background: "transparent",
                  border: `1px dashed ${theme.border}`,
                  borderRadius: 8,
                  color: theme.muted,
                  height: 50,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    background: theme.bg,
                    color: theme.muted,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: theme.mono,
                    fontSize: 11,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {selected.length + i + 1}
                </div>
                <span
                  style={{
                    fontFamily: theme.mono,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    fontSize: 11,
                  }}
                >
                  Empty slot
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
