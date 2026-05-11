"use client";

import { useState, useEffect, useMemo, CSSProperties } from "react";
import type { Cocktail } from "@/lib/cocktails";
import type { Theme } from "@/lib/themes";

interface BarModeProps {
  theme: Theme;
  cocktails: Cocktail[]; // The user's chosen favorites (up to 10)
  allCocktails: Cocktail[];
  orientation: "landscape" | "portrait";
  eightySix: string[];
  onOpen: (c: Cocktail) => void;
  onExit: () => void;
  onSetOrientation: (o: "landscape" | "portrait") => void;
}

function LiveClock({ theme }: { theme: Theme }) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const h = time.getHours(),
    m = String(time.getMinutes()).padStart(2, "0");
  const hh = ((h + 11) % 12) + 1;
  return (
    <div
      style={{
        fontFamily: theme.mono,
        fontSize: 12,
        color: theme.muted,
        padding: "7px 12px",
        border: `1px solid ${theme.border}`,
        borderRadius: 6,
        letterSpacing: 1,
      }}
    >
      {hh}:{m} {h >= 12 ? "PM" : "AM"}
    </div>
  );
}

function PinModal({
  theme,
  onCancel,
  onUnlock,
}: {
  theme: Theme;
  onCancel: () => void;
  onUnlock: () => void;
}) {
  const [entered, setEntered] = useState("");
  const [err, setErr] = useState(false);

  const submit = (val: string) => {
    if (val === "1234") {
      onUnlock();
    } else {
      setErr(true);
      setTimeout(() => {
        setEntered("");
        setErr(false);
      }, 600);
    }
  };

  const pressDigit = (n: number) => {
    const next = entered + n;
    setEntered(next);
    if (next.length === 4) submit(next);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          padding: 36,
          width: 360,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: theme.display,
            fontStyle: "italic",
            fontSize: 28,
            color: theme.text,
            marginBottom: 6,
          }}
        >
          Enter PIN
        </div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: theme.muted,
            fontFamily: theme.mono,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Manager code to exit Bar Mode
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 54,
                borderRadius: 8,
                border: `1px solid ${err ? "#E06767" : theme.border}`,
                background: theme.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                color: theme.text,
              }}
            >
              {entered[i] ? "•" : ""}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => pressDigit(n)}
              style={{
                height: 54,
                fontSize: 20,
                background: theme.bg,
                color: theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={onCancel}
            style={{
              height: 54,
              fontSize: 11,
              letterSpacing: 2,
              background: "transparent",
              color: theme.muted,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: theme.mono,
              textTransform: "uppercase",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => pressDigit(0)}
            style={{
              height: 54,
              fontSize: 20,
              background: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            0
          </button>
          <button
            onClick={() => setEntered((e) => e.slice(0, -1))}
            style={{
              height: 54,
              fontSize: 14,
              background: "transparent",
              color: theme.muted,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ←
          </button>
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 10,
            letterSpacing: 1.5,
            color: theme.muted,
            fontFamily: theme.mono,
            textTransform: "uppercase",
          }}
        >
          Hint: 1234
        </div>
      </div>
    </div>
  );
}

function BarTile({
  cocktail,
  theme,
  onClick,
  index,
  eightySixed,
}: {
  cocktail: Cocktail;
  theme: Theme;
  onClick: () => void;
  index: number;
  eightySixed: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        borderRadius: 14,
        border: `1px solid ${eightySixed ? "#E0633F66" : theme.border}`,
        background: theme.surface,
        padding: 0,
        textAlign: "left",
        transform: hover && !eightySixed ? "scale(1.02)" : "scale(1)",
        transition:
          "transform 220ms cubic-bezier(.2,.7,.2,1), box-shadow 220ms",
        boxShadow:
          hover && !eightySixed
            ? `0 20px 40px rgba(0,0,0,0.5), 0 0 0 2px ${theme.accent}`
            : "0 4px 12px rgba(0,0,0,0.3)",
        fontFamily: "inherit",
        color: theme.text,
        opacity: eightySixed ? 0.55 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${cocktail.img})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: hover ? "scale(1.08)" : "scale(1)",
          transition: "transform 400ms ease",
          filter: eightySixed ? "grayscale(0.7)" : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, transparent 40%, ${theme.bg}F5)`,
        }}
      />
      {eightySixed && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 10,
            letterSpacing: 3,
            fontFamily: theme.mono,
            color: "#E89B7E",
            background: "rgba(224,99,63,0.18)",
            padding: "4px 8px",
            textTransform: "uppercase",
          }}
        >
          86&apos;d — missing ingredient
        </div>
      )}
      {/* Category + ABV badges */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          right: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: theme.text,
            fontFamily: theme.mono,
            textTransform: "uppercase",
            padding: "4px 8px",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            borderRadius: 4,
            opacity: 0.9,
          }}
        >
          {cocktail.category}
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            color: theme.accent,
            fontFamily: theme.mono,
            padding: "4px 8px",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            borderRadius: 4,
          }}
        >
          {cocktail.abv}
        </div>
      </div>
      {/* Name + meta */}
      <div style={{ position: "absolute", bottom: 18, left: 18, right: 18 }}>
        <div
          style={{
            fontFamily: theme.display,
            fontStyle: "italic",
            letterSpacing: -0.5,
            color: theme.text,
            lineHeight: 0.95,
            fontSize: "clamp(22px, 2.2vw, 40px)",
          }}
        >
          {cocktail.name}
        </div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: theme.muted,
            fontFamily: theme.mono,
            textTransform: "uppercase",
            marginTop: 8,
            display: "flex",
            gap: 12,
          }}
        >
          <span>{cocktail.glass}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{cocktail.time}</span>
        </div>
      </div>
    </button>
  );
}

export function BarMode({
  theme,
  cocktails,
  allCocktails,
  orientation,
  eightySix,
  onOpen,
  onExit,
  onSetOrientation,
}: BarModeProps) {
  const [showUnlock, setShowUnlock] = useState(false);
  const [board, setBoard] = useState("favorites");

  // Build boards: Favorites + one per spirit category
  const boards = useMemo(() => {
    const out: { id: string; name: string; cocktails: Cocktail[] }[] = [
      { id: "favorites", name: "Favorites", cocktails },
    ];
    const cats: Record<string, Cocktail[]> = {};
    allCocktails.forEach((c) => {
      if (!cats[c.category]) cats[c.category] = [];
      cats[c.category].push(c);
    });
    Object.entries(cats).forEach(([cat, list]) => {
      out.push({ id: `cat-${cat}`, name: cat, cocktails: list.slice(0, 10) });
    });
    return out;
  }, [cocktails, allCocktails]);

  const activeBoard = boards.find((b) => b.id === board) || boards[0];
  const tiles = activeBoard.cocktails;

  const cols = orientation === "landscape" ? 5 : 2;
  const rows = orientation === "landscape" ? 2 : 5;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        fontFamily: theme.ui,
        overflow: "hidden",
        zIndex: 200,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: orientation === "landscape" ? "14px 28px" : "20px 24px",
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: theme.display,
              fontSize: 22,
              fontStyle: "italic",
              color: theme.accent,
              whiteSpace: "nowrap",
            }}
          >
            BarIQ
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: theme.muted,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Bar Mode · {activeBoard.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Orientation toggle */}
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
            {(["landscape", "portrait"] as const).map((o) => (
              <button
                key={o}
                onClick={() => onSetOrientation(o)}
                style={{
                  padding: "5px 10px",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  background: orientation === o ? theme.accent : "transparent",
                  color: orientation === o ? theme.bg : theme.muted,
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: theme.mono,
                }}
              >
                {o}
              </button>
            ))}
          </div>
          <LiveClock theme={theme} />
          <button
            onClick={() => setShowUnlock(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              fontSize: 12,
              background: theme.surface,
              color: theme.muted,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            🔒 Exit
          </button>
        </div>
      </header>

      {/* Category tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "10px 24px",
          overflowX: "auto",
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0,
          scrollbarWidth: "none",
        }}
      >
        {boards.map((b) => (
          <button
            key={b.id}
            onClick={() => setBoard(b.id)}
            style={{
              padding: "7px 14px",
              fontSize: 11,
              fontFamily: theme.mono,
              letterSpacing: 1.8,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              background: board === b.id ? theme.accent : "transparent",
              color: board === b.id ? theme.bg : theme.muted,
              border: `1px solid ${board === b.id ? theme.accent : theme.border}`,
              borderRadius: 999,
              cursor: "pointer",
              fontWeight: board === b.id ? 600 : 400,
            }}
          >
            {b.id === "favorites" && "★ "}
            {b.name}
            <span style={{ marginLeft: 6, opacity: 0.6, fontWeight: 400 }}>
              {b.cocktails.length}
            </span>
          </button>
        ))}
      </div>

      {/* Tile grid */}
      <div
        style={{
          flex: 1,
          padding: orientation === "landscape" ? 20 : 16,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: orientation === "landscape" ? 14 : 12,
          overflow: "hidden",
        }}
      >
        {tiles.map((c, i) => {
          const out = c.ingredients.some((ing) =>
            eightySix.includes(ing.name)
          );
          return (
            <BarTile
              key={c.id}
              cocktail={c}
              theme={theme}
              onClick={() => onOpen(c)}
              index={i}
              eightySixed={out}
            />
          );
        })}
        {Array.from({ length: Math.max(0, rows * cols - tiles.length) }).map(
          (_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                borderRadius: 14,
                border: `1px dashed ${theme.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.muted,
                fontSize: 10,
                letterSpacing: 2,
                fontFamily: theme.mono,
                textTransform: "uppercase",
                opacity: 0.4,
              }}
            >
              —
            </div>
          )
        )}
      </div>

      {showUnlock && (
        <PinModal
          theme={theme}
          onCancel={() => setShowUnlock(false)}
          onUnlock={() => {
            onExit();
            setShowUnlock(false);
          }}
        />
      )}
    </div>
  );
}
