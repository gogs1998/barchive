"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type BarIngredientAPI } from "@/lib/auth-context";
import { IngredientPicker } from "@/components/IngredientPicker";
import { CocktailCard } from "@/components/CocktailCard";
import { STARTER_INGREDIENTS } from "@/lib/onboarding-ingredients";
import { COCKTAILS } from "@/lib/cocktails";
import { isMakeable, countMakeable } from "@/lib/makeable";
import styles from "./OnboardingWizard.module.css";

const ONBOARDED_KEY = "biq_onboarded";

function markOnboarded() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // ignore storage failures — onboarding must never block the app
  }
}

/** Build the BarIngredientAPI[] a guest bar expects from selected names. */
function toGuestItems(names: string[]): BarIngredientAPI[] {
  return names.map((name) => ({ id: name, name, category: "Other" }));
}

type Step = 1 | 2 | 3;

export function OnboardingWizard() {
  const router = useRouter();
  const { setGuestBar, openAuthModal } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<string[]>([]);

  const barNames = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected]
  );
  const makeableCount = useMemo(
    () => countMakeable(COCKTAILS, barNames),
    [barNames]
  );
  const examples = useMemo(
    () => COCKTAILS.filter((c) => isMakeable(c, barNames)).slice(0, 6),
    [barNames]
  );

  const toggle = (name: string) =>
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const skip = () => {
    markOnboarded();
    router.push("/");
  };

  const finishAndBrowse = () => {
    setGuestBar(toGuestItems(selected));
    markOnboarded();
    router.push("/cocktails?make=1");
  };

  const finishAndSave = () => {
    setGuestBar(toGuestItems(selected));
    markOnboarded();
    openAuthModal("register");
  };

  return (
    <div className={styles.wizard}>
      {/* Progress */}
      <ol className={styles.progress} aria-label="Onboarding progress">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={`${styles.dot} ${step >= n ? styles.dotActive : ""}`}
            aria-current={step === n ? "step" : undefined}
          />
        ))}
      </ol>

      {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
      {step === 1 && (
        <section className={styles.panel} aria-labelledby="onboard-welcome">
          <p className={styles.eyebrow}>Welcome to BarIQ</p>
          <h1 id="onboard-welcome" className={styles.title}>
            Find out what you can make tonight
          </h1>
          <p className={styles.lead}>
            Browse {COCKTAILS.length.toLocaleString()} cocktails, tell us what&apos;s
            on your shelf, and we&apos;ll show you exactly which drinks you can mix
            right now.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setStep(2)}
            >
              Get started
            </button>
            <button type="button" className={styles.ghostBtn} onClick={skip}>
              Skip
            </button>
          </div>
        </section>
      )}

      {/* ── Step 2: Build your bar ──────────────────────────────────────── */}
      {step === 2 && (
        <section className={styles.panel} aria-labelledby="onboard-bar">
          <h1 id="onboard-bar" className={styles.title}>
            Build your bar
          </h1>
          <p className={styles.lead}>
            Tap everything you already have. The more you add, the more we can
            match.
          </p>

          <IngredientPicker
            items={STARTER_INGREDIENTS}
            selected={selected}
            onToggle={toggle}
          />

          <div className={styles.actions}>
            <span className={styles.selectedCount} aria-live="polite">
              {selected.length} selected
            </span>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setStep(3)}
            >
              Continue
            </button>
            <button type="button" className={styles.ghostBtn} onClick={skip}>
              Skip
            </button>
          </div>
        </section>
      )}

      {/* ── Step 3: Payoff ──────────────────────────────────────────────── */}
      {step === 3 && (
        <section className={styles.panel} aria-labelledby="onboard-payoff">
          {selected.length === 0 ? (
            <>
              <h1 id="onboard-payoff" className={styles.title}>
                Add a few ingredients to see what you can make
              </h1>
              <p className={styles.lead}>
                You haven&apos;t picked anything yet. Go back and tap a few bottles
                to unlock your matches.
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setStep(2)}
                >
                  Back to my bar
                </button>
                <button type="button" className={styles.ghostBtn} onClick={skip}>
                  Skip
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.eyebrow}>You can make</p>
              <h1 id="onboard-payoff" className={styles.title}>
                {makeableCount.toLocaleString()}{" "}
                {makeableCount === 1 ? "cocktail" : "cocktails"} right now
              </h1>

              {examples.length > 0 && (
                <div className={styles.examples} role="list">
                  {examples.map((cocktail) => (
                    <div key={cocktail.id} role="listitem">
                      <CocktailCard cocktail={cocktail} makeable />
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={finishAndBrowse}
                >
                  Browse what I can make
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={finishAndSave}
                >
                  Save my bar
                </button>
                <button type="button" className={styles.ghostBtn} onClick={skip}>
                  Skip
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <p className={styles.footnote}>
        You can change your bar any time from{" "}
        <Link href="/my-bar" className={styles.footLink}>
          My Bar
        </Link>
        .
      </p>
    </div>
  );
}
