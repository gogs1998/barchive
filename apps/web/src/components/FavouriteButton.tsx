"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { addUserFavourite, removeUserFavourite } from "@/lib/api";
import styles from "./FavouriteButton.module.css";

interface Props {
  slug: string;
  recipeName: string;
  /** visual size variant */
  size?: "card" | "detail";
}

export function FavouriteButton({ slug, recipeName, size = "card" }: Props) {
  const { user, favourites, toggleFavourite, openAuthModal } = useAuth();
  const isFaved = favourites.includes(slug);
  const [loading, setLoading] = useState(false);
  const [nudge, setNudge] = useState(false);

  const handleClick = useCallback(async () => {
    if (!user) {
      // Unauthenticated: nudge animation + open auth modal
      setNudge(true);
      setTimeout(() => setNudge(false), 400);
      openAuthModal("login");
      return;
    }
    setLoading(true);
    // Optimistic — toggle immediately in local state
    const wasAdding = !isFaved;
    toggleFavourite(slug);
    try {
      if (wasAdding) {
        await addUserFavourite(slug);
      } else {
        await removeUserFavourite(slug);
      }
    } catch {
      // Roll back on error
      toggleFavourite(slug);
    } finally {
      setLoading(false);
    }
  }, [user, slug, isFaved, toggleFavourite, openAuthModal]);

  return (
    <button
      type="button"
      className={[
        styles.btn,
        size === "detail" ? styles.detail : styles.card,
        isFaved ? styles.faved : "",
        nudge ? styles.nudge : "",
        loading ? styles.loading : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      aria-label={
        isFaved
          ? `Remove ${recipeName} from favourites`
          : `Save ${recipeName} to favourites`
      }
      aria-pressed={isFaved}
      disabled={loading}
    >
      {loading ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={styles.spinner}>
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="10"/>
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isFaved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}
