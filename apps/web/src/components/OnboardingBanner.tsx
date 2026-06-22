"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./OnboardingBanner.module.css";

const ONBOARDED_KEY = "biq_onboarded";

/**
 * First-visit prompt shown on the home page. Renders nothing once the user has
 * onboarded or dismissed it (tracked via the `biq_onboarded` localStorage flag).
 * SSR-safe: hidden until mount so the static export never flashes the banner.
 */
export function OnboardingBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(ONBOARDED_KEY)) setShow(true);
    } catch {
      // ignore storage failures — simply don't show the banner
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  return (
    <div className={styles.banner} role="complementary" aria-label="Get started">
      <div className={styles.content}>
        <p className={styles.headline}>New here?</p>
        <p className={styles.sub}>
          Set up your bar in 30 seconds and see what you can make tonight.
        </p>
      </div>
      <div className={styles.actions}>
        <Link href="/welcome" className={styles.cta}>
          Set up my bar →
        </Link>
        <button
          type="button"
          className={styles.dismiss}
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M2 2l14 14M16 2L2 16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
