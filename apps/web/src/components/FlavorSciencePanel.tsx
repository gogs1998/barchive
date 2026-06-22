// src/components/FlavorSciencePanel.tsx
"use client";

import { useState, useId } from "react";
import styles from "./FlavorSciencePanel.module.css";

interface Props {
  rating: string;
  overall: number;
  children: React.ReactNode;
}

/** Opt-in disclosure that reveals the build-time-rendered balance meter. */
export function FlavorSciencePanel({ rating, overall, children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <section className={styles.root} aria-labelledby={`${id}-btn`}>
      <button
        id={`${id}-btn`}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.label}>Flavor Science</span>
        <span className={styles.badge}>
          {rating} · {Math.round(overall)}
        </span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={id} className={styles.body} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
