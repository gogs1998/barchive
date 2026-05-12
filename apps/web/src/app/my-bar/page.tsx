"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { IngredientList, type BarIngredient } from "@/components/IngredientList";
import { AddIngredientSheet, } from "@/components/AddIngredientSheet";
import styles from "./page.module.css";

// Canonical map — stub (replace with API lookup)
const INGREDIENT_MAP: Record<string, BarIngredient> = {
  "gin":                { id: "gin",                name: "Gin",               category: "Spirits",   emoji: "🫙" },
  "vodka":              { id: "vodka",              name: "Vodka",             category: "Spirits",   emoji: "🫙" },
  "rum":                { id: "rum",                name: "Rum",               category: "Spirits",   emoji: "🫙" },
  "dark-rum":           { id: "dark-rum",           name: "Dark rum",          category: "Spirits",   emoji: "🫙" },
  "tequila":            { id: "tequila",            name: "Tequila",           category: "Spirits",   emoji: "🫙" },
  "whiskey":            { id: "whiskey",            name: "Whiskey",           category: "Spirits",   emoji: "🫙" },
  "bourbon":            { id: "bourbon",            name: "Bourbon",           category: "Spirits",   emoji: "🫙" },
  "brandy":             { id: "brandy",             name: "Brandy",            category: "Spirits",   emoji: "🫙" },
  "sloe-gin":           { id: "sloe-gin",           name: "Sloe gin",          category: "Spirits",   emoji: "🫙" },
  "amaretto":           { id: "amaretto",           name: "Amaretto",          category: "Liqueurs",  emoji: "🫙" },
  "triple-sec":         { id: "triple-sec",         name: "Triple sec",        category: "Liqueurs",  emoji: "🫙" },
  "kahlua":             { id: "kahlua",             name: "Kahlúa",            category: "Liqueurs",  emoji: "🫙" },
  "baileys":            { id: "baileys",            name: "Baileys",           category: "Liqueurs",  emoji: "🫙" },
  "campari":            { id: "campari",            name: "Campari",           category: "Liqueurs",  emoji: "🫙" },
  "aperol":             { id: "aperol",             name: "Aperol",            category: "Liqueurs",  emoji: "🫙" },
  "sweet-vermouth":     { id: "sweet-vermouth",     name: "Sweet vermouth",    category: "Liqueurs",  emoji: "🫙" },
  "dry-vermouth":       { id: "dry-vermouth",       name: "Dry vermouth",      category: "Liqueurs",  emoji: "🫙" },
  "lime-juice":         { id: "lime-juice",         name: "Lime juice",        category: "Mixers",    emoji: "🍋" },
  "lemon-juice":        { id: "lemon-juice",        name: "Lemon juice",       category: "Mixers",    emoji: "🍋" },
  "simple-syrup":       { id: "simple-syrup",       name: "Simple syrup",      category: "Syrups",    emoji: "🍯" },
  "grenadine":          { id: "grenadine",          name: "Grenadine",         category: "Syrups",    emoji: "🍯" },
  "ginger-syrup":       { id: "ginger-syrup",       name: "Ginger syrup",      category: "Syrups",    emoji: "🍯" },
  "angostura-bitters":  { id: "angostura-bitters",  name: "Angostura bitters", category: "Bitters",   emoji: "💧" },
  "orange-bitters":     { id: "orange-bitters",     name: "Orange bitters",    category: "Bitters",   emoji: "💧" },
  "peychauds-bitters":  { id: "peychauds-bitters",  name: "Peychaud's bitters",category: "Bitters",   emoji: "💧" },
  "soda-water":         { id: "soda-water",         name: "Soda water",        category: "Mixers",    emoji: "💧" },
  "tonic-water":        { id: "tonic-water",        name: "Tonic water",       category: "Mixers",    emoji: "💧" },
  "ginger-beer":        { id: "ginger-beer",        name: "Ginger beer",       category: "Mixers",    emoji: "🍺" },
  "cola":               { id: "cola",               name: "Cola",              category: "Mixers",    emoji: "🥤" },
  "egg-white":          { id: "egg-white",           name: "Egg white",         category: "Other",     emoji: "🥚" },
  "cream":              { id: "cream",              name: "Heavy cream",        category: "Other",     emoji: "🥛" },
  "mint":               { id: "mint",               name: "Mint",              category: "Garnishes", emoji: "🌿" },
  "lime-wedge":         { id: "lime-wedge",         name: "Lime wedge",        category: "Garnishes", emoji: "🍋" },
  "salt":               { id: "salt",               name: "Salt",              category: "Garnishes", emoji: "🧂" },
  "maraschino-cherry":  { id: "maraschino-cherry",  name: "Maraschino cherry", category: "Garnishes", emoji: "🍒" },
};

export default function MyBarPage() {
  const { user, loading, barIngredients, openAuthModal, addBarIngredient } = useAuth();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Redirect unauthenticated users to auth modal then back
  useEffect(() => {
    if (!loading && !user) {
      openAuthModal("login");
    }
  }, [loading, user, openAuthModal]);

  const ingredients: BarIngredient[] = barIngredients
    .map((id) => INGREDIENT_MAP[id])
    .filter(Boolean);

  const QUICK_ADD_IDS = ["gin", "vodka", "rum", "tequila"];

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

      {/* Content */}
      {ingredients.length === 0 ? (
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
              {QUICK_ADD_IDS.map((id) => {
                const ing = INGREDIENT_MAP[id];
                if (!ing) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    className={styles.popularChip}
                    onClick={() => addBarIngredient(id)}
                  >
                    {ing.name}
                  </button>
                );
              })}
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
