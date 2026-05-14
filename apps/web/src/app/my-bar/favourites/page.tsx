"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FavouriteButton } from "@/components/FavouriteButton";
import { getCocktails } from "@/lib/api";
import { useEffect } from "react";
import type { Cocktail } from "@/lib/api";
import styles from "./page.module.css";

type SortKey = "newest" | "alpha" | "category";

export default function FavouritesPage() {
  const { user, favourites, loading } = useAuth();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("newest");
  const [allCocktails, setAllCocktails] = useState<Cocktail[]>([]);

  useEffect(() => {
    getCocktails({ pageSize: 200 }).then(({ cocktails }) => setAllCocktails(cocktails));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, user, router]);

  const favCocktails = allCocktails.filter((c) => favourites.includes(c.slug));

  const sorted = [...favCocktails].sort((a, b) => {
    if (sort === "alpha") return a.name.localeCompare(b.name);
    if (sort === "category") return a.category.localeCompare(b.category);
    // "newest" = order added (favourites array order, reversed)
    return favourites.indexOf(b.slug) - favourites.indexOf(a.slug);
  });

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className={styles.title}>My Bar</h1>
      </header>

      {/* Tabs */}
      <nav className={styles.tabs} aria-label="My Bar sections">
        <Link href="/my-bar" className={styles.tab}>My Bar</Link>
        <Link href="/my-bar/favourites" className={`${styles.tab} ${styles.tabActive}`} aria-current="page">Favourites</Link>
      </nav>

      {/* Content */}
      {sorted.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">♡</span>
          <h2 className={styles.emptyHeading}>No saved recipes yet</h2>
          <p className={styles.emptyText}>Tap the heart on any recipe to save it here.</p>
          <Link href="/cocktails" className={styles.browseBtn}>Browse recipes</Link>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <p className={styles.count}>Saved recipes ({sorted.length})</p>
            <label htmlFor="sort-select" className={styles.sortLabel}>Sort:</label>
            <select
              id="sort-select"
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort favourites"
            >
              <option value="newest">Newest</option>
              <option value="alpha">A–Z</option>
              <option value="category">Category</option>
            </select>
          </div>

          <ul className={styles.list} role="list">
            {sorted.map((cocktail) => (
              <li key={cocktail.slug} className={styles.item}>
                <Link href={`/cocktails/${cocktail.slug}`} className={styles.itemLink}>
                  <div className={styles.imageWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cocktail.img || "/placeholder-cocktail.jpg"}
                      alt=""
                      className={styles.image}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.info}>
                    <p className={styles.name}>{cocktail.name}</p>
                    <p className={styles.ingredients}>
                      {cocktail.ingredients.slice(0, 3).map((i) => i.name).join(", ")}
                    </p>
                  </div>
                </Link>
                <FavouriteButton slug={cocktail.slug} recipeName={cocktail.name} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
