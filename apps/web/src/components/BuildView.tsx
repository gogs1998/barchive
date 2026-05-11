"use client";

import { useState, useEffect, CSSProperties } from "react";
import type { Cocktail } from "@/lib/cocktails";
import type { Theme } from "@/lib/themes";

interface BuildViewProps {
  cocktail: Cocktail;
  theme: Theme;
  multiplier: number;
  setMultiplier: (n: number) => void;
  onClose: () => void;
  eightySix: string[];
}

function navBtn(theme: Theme, disabled: boolean): CSSProperties {
  return {
    padding: "12px 24px",
    fontSize: 14,
    fontFamily: theme.mono,
    letterSpacing: 2,
    textTransform: "uppercase",
    background: "transparent",
    color: disabled ? theme.muted : theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function stepTimer(text: string): number | null {
  const m = text.match(/(\d+)\s*(second|sec|s)\b/i);
  return m ? parseInt(m[1]) : null;
}

function scaleAmount(amt: string, multiplier: number): string {
  if (multiplier === 1) return amt;
  const m = amt.match(/^([\d.]+)\s*(.*)$/);
  if (m) {
    const num = parseFloat(m[1]) * multiplier;
    return `${num % 1 === 0 ? num : num.toFixed(2)} ${m[2]}`;
  }
  return amt;
}

export function BuildView({
  cocktail,
  theme,
  multiplier,
  setMultiplier,
  onClose,
  eightySix,
}: BuildViewProps) {
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (timer === null || !running) return;
    if (timer <= 0) {
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setTimer((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timer, running]);

  const total = cocktail.steps.length;
  const current = cocktail.steps[step];
  const t = stepTimer(current);

  const next = () => {
    if (step < total - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      const nt = stepTimer(cocktail.steps[nextStep]);
      setTimer(nt);
      setRunning(false);
    }
  };

  const prev = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      const pt = stepTimer(cocktail.steps[prevStep]);
      setTimer(pt);
      setRunning(false);
    }
  };

  const missing = cocktail.ingredients.filter((i) => eightySix.includes(i.name));

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
        zIndex: 300,
      }}
    >
      {/* Blurred bg photo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${cocktail.img})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.15,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse, transparent 0%, ${theme.bg}E0 80%)`,
        }}
      />

      {/* Header */}
      <header
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          borderBottom: `1px solid ${theme.border}`,
          zIndex: 2,
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${theme.border}`,
              color: theme.text,
              padding: "7px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            ← Exit
          </button>
          <div
            style={{
              fontFamily: theme.display,
              fontStyle: "italic",
              fontSize: 22,
              color: theme.accent,
              letterSpacing: -0.5,
              whiteSpace: "nowrap",
            }}
          >
            {cocktail.name}
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2.5,
              color: theme.muted,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Build · {cocktail.glass} · {cocktail.time}
          </div>
        </div>

        {/* Batch multiplier */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: theme.muted,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              marginRight: 4,
            }}
          >
            Batch
          </div>
          {[1, 2, 4, 8].map((n) => (
            <button
              key={n}
              onClick={() => setMultiplier(n)}
              style={{
                width: 34,
                height: 34,
                fontSize: 12,
                fontWeight: 600,
                background: multiplier === n ? theme.accent : "transparent",
                color: multiplier === n ? theme.bg : theme.text,
                border: `1px solid ${multiplier === n ? theme.accent : theme.border}`,
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ×{n}
            </button>
          ))}
        </div>
      </header>

      {/* 86 warning */}
      {missing.length > 0 && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: "8px 32px",
            background: "#E0633F22",
            borderBottom: "1px solid #E0633F66",
            fontSize: 12,
            color: "#E89B7E",
            fontFamily: theme.mono,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          ⚠ 86&apos;d: {missing.map((i) => i.name).join(" · ")}
        </div>
      )}

      {/* Body: ingredients + active step */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(240px, 280px) 1fr",
          position: "relative",
          zIndex: 2,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Ingredients panel */}
        <div
          style={{
            padding: "20px 22px",
            borderRight: `1px solid ${theme.border}`,
            background: `${theme.surface}80`,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 3,
              color: theme.muted,
              fontFamily: theme.mono,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Spec — {cocktail.ingredients.length} ingredients
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cocktail.ingredients.map((ing, i) => {
              const out = eightySix.includes(ing.name);
              return (
                <div
                  key={i}
                  style={{
                    paddingBottom: 10,
                    borderBottom: `1px solid ${theme.border}`,
                    opacity: out ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: theme.display,
                        fontStyle: "italic",
                        fontSize: 17,
                        color: theme.text,
                        textDecoration: out ? "line-through" : "none",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ing.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: 1,
                        color: theme.accent,
                        fontFamily: theme.mono,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {scaleAmount(ing.amount, multiplier)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active step — huge */}
        <div
          onClick={next}
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px 50px 30px",
            cursor: "pointer",
          }}
        >
          {/* Progress */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 18,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: theme.mono,
                fontSize: 14,
                color: theme.accent,
                letterSpacing: 2,
              }}
            >
              STEP {String(step + 1).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </div>
            <div
              style={{
                flex: 1,
                height: 2,
                background: theme.border,
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((step + 1) / total) * 100}%`,
                  background: theme.accent,
                  transition: "width 300ms",
                }}
              />
            </div>
          </div>

          {/* Step text */}
          <div
            key={step}
            style={{
              fontFamily: theme.display,
              fontSize: "clamp(36px, 4vw, 64px)",
              lineHeight: 1.1,
              letterSpacing: -1,
              color: theme.text,
              fontStyle: "italic",
              flex: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            {current}
          </div>

          {/* Timer */}
          {t !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: 18,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  if (timer === null) setTimer(t);
                  setRunning((r) => !r);
                }}
                style={{
                  padding: "14px 28px",
                  fontSize: 18,
                  fontWeight: 700,
                  background: running ? "#E06F4A" : theme.accent,
                  color: theme.bg,
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: theme.mono,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {running ? "Pause" : timer !== null ? "Resume" : "Start"} {t}s
              </button>
              {timer !== null && (
                <div
                  style={{
                    fontFamily: theme.mono,
                    fontSize: 64,
                    fontWeight: 600,
                    color: timer <= 3 ? "#E06F4A" : theme.text,
                    letterSpacing: -2,
                  }}
                >
                  {String(timer).padStart(2, "0")}s
                </div>
              )}
            </div>
          )}

          {/* Nav */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={prev}
              disabled={step === 0}
              style={navBtn(theme, step === 0)}
            >
              ← Previous
            </button>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                color: theme.muted,
                fontFamily: theme.mono,
                textTransform: "uppercase",
              }}
            >
              Tap step area to advance
            </div>
            <button
              onClick={next}
              disabled={step === total - 1}
              style={{
                ...navBtn(theme, step === total - 1),
                background:
                  step === total - 1 ? theme.surface : theme.accent,
                color: step === total - 1 ? theme.muted : theme.bg,
                borderColor:
                  step === total - 1 ? theme.border : theme.accent,
              }}
            >
              {step === total - 1 ? "Complete ✓" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
