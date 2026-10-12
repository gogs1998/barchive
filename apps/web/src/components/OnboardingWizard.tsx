"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type BarIngredientAPI } from "@/lib/auth-context";
import { IngredientPicker } from "@/components/IngredientPicker";
import { CocktailCard } from "@/components/CocktailCard";
import { STARTER_INGREDIENTS } from "@/lib/onboarding-ingredients";
import { COCKTAILS } from "@/lib/cocktails";
import { isMakeable, countMakeable } from "@/lib/makeable";
import { slugify } from "@/lib/slug";
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
  // Keyed by slug: the Worker resolves bar items by ingredients.slug (NEW-1).
  return names.map((name) => ({ id: slugify(name), name, category: "Other" }));
}

type Step = 1 | 2 | 3;

export function OnboardingWizard() {
  const router = useRouter();
  const {
    user,
    setGuestBar,
    openAuthModal,
    barIngredientData = [],
    barHydrated = true,
  } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const seededRef = useRef(false);

  const isAuthed = Boolean(user);

  // P1-5: the wizard only manages the *guest* bar. A signed-in user landing on
  // /welcome must not have their account bar overwritten — redirect them out
  // before any setGuestBar/register-modal side effect can fire.
  useEffect(() => {
    if (isAuthed) router.replace("/my-bar");
  }, [isAuthed, router]);

  // P1-6: seed the selection from the existing guest bar so a returning guest
  // merges (adds to) their bar instead of replacing it wholesale.
  useEffect(() => {
    if (seededRef.current || isAuthed || !barHydrated) return;
    seededRef.current = true;
    if (barIngredientData.length > 0) {
      setSelected(barIngredientData.map((i) => i.name));
    }
  }, [barHydrated, isAuthed, barIngredientData]);

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
    // Guest-only write; signed-in users are redirected before reaching here (P1-5).
    if (!isAuthed) setGuestBar(toGuestItems(selected));
    markOnboarded();
    router.push("/cocktails?make=1");
  };

  const finishAndSave = () => {
    // A signed-in user already has an account bar — never clobber it or reopen
    // the register modal; just send them to My Bar (P1-5).
    if (isAuthed) {
      markOnboarded();
      router.push("/my-bar");
      return;
    }
    setGuestBar(toGuestItems(selected));
    markOnboarded();
    openAuthModal("register");
  };

  // While redirecting a signed-in user, render nothing to avoid flashing the
  // guest wizard (which could momentarily invite a clobbering action).
  if (isAuthed) return null;

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
