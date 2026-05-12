"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { IngredientList, type BarIngredient } from "@/components/IngredientList";
import { AddIngredientSheet, } from "@/components/AddIngredientSheet";
import styles from "./page.module.css";

// Emoji map by category (fallback for ingredients without one)
function categoryEmoji(category: string): string {
  switch (category.toLowerCase()) {
    case "spirits": return "🫙";
    case "liqueurs": return "🫙";
    case "mixers": return "💧";
    case "syrups": return "🍯";
    case "bitters": return "💧";
    case "garnishes": return "🌿";
    default: return "🫙";
  }
}

const QUICK_ADD_IDS = ["gin", "vodka", "rum", "tequila"];

export default function MyBarPage() {
  const { user, loading, barIngredientData, barLoading, openAuthModal, addBarIngredient } = useAuth();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Redirect unauthenticated users to auth modal then back
  useEffect(() => {
    if (!loading && !user) {
      openAuthModal("login");
    }
  }, [loading, user, openAuthModal]);

  // Map API data to BarIngredient shape for IngredientList
  const ingredients: BarIngredient[] = barIngredientData.map((ing) => ({
    id: ing.id,
    name: ing.name,
    category: ing.category,
    emoji: categoryEmoji(ing.category),
  }));

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <p className={styles.authPrompt}>Sign in to access your bar.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Sticky header */}
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>My Bar</h1>
        <button type="button" className={styles.addBtn} onClick={() => setSheetOpen(true)} aria-label="Add ingredients">
          + Add
        </button>
      </header>

      {/* Tab nav */}
      <nav className={styles.tabs} aria-label="My Bar sections">
        <Link href="/my-bar" className={`${styles.tab} ${styles.tabActive}`} aria-current="page">My Bar</Link>
        <Link href="/my-bar/favourites" className={styles.tab}>Favourites</Link>
      </nav>

      {/* Bar loading skeleton */}
      {barLoading ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      ) : ingredients.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">🍸</span>
          <h2 className={styles.emptyHeading}>Your bar is empty</h2>
          <p className={styles.emptyText}>Add the ingredients you have to discover cocktails you can make right now.</p>
          <button type="button" className={styles.emptyAddBtn} onClick={() => setSheetOpen(true)}>
            + Add your first ingredient
          </button>
          <div className={styles.popularSection}>
            <p className={styles.popularLabel}>Popular starts:</p>
            <div className={styles.popularChips}>
              {QUICK_ADD_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.popularChip}
                  onClick={() => addBarIngredient(id)}
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.content}>
          <p className={styles.count}>Your bar ({ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""})</p>
          <IngredientList ingredients={ingredients} />
          <div className={styles.recipesTeaser}>
            <Link href="/cocktails" className={styles.teaserLink}>
              View matching recipes →
            </Link>
          </div>
        </div>
      )}

      <AddIngredientSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </main>
  );
}

