import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { CocktailCard } from "@/components/CocktailCard";
import { CategoryGrid } from "@/components/CategoryGrid";
import { getCocktails, getCategories } from "@/lib/api";
import styles from "./page.module.css";

export default async function HomePage() {
  const [{ cocktails: featured }, categories] = await Promise.all([
    getCocktails({ pageSize: 6 }),
    getCategories(),
  ]);

  return (
    <PageShell active="home">
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        {/* Background SVG logo */}
        <div className={styles.heroBg} aria-hidden="true">
          <svg
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.heroSvg}
          >
            <g
              stroke="#C89B5C"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.12"
            >
              <path d="M120 130 L280 130 L210 230 L210 290 M170 290 L250 290" />
              <line x1="160" y1="170" x2="240" y2="170" />
            </g>
          </svg>
        </div>

        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>The bartender&apos;s companion</p>
          <h1 id="hero-heading" className={styles.heroTitle}>
            BarIQ
          </h1>
          <p className={styles.heroSub}>
            80+ classic cocktail recipes. Search, browse, and mix with
            confidence.
          </p>
          <div className={styles.heroActions}>
            <Link href="/cocktails" className={styles.btnPrimary}>
              Browse Cocktails
            </Link>
            <Link href="/ingredients" className={styles.btnSecondary}>
              By Ingredient
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section
        className={styles.section}
        aria-labelledby="categories-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="categories-heading" className={styles.sectionTitle}>
            By Spirit
          </h2>
          <span className={styles.sectionLabel}>
            {categories.length} categories
          </span>
        </div>
        <CategoryGrid categories={categories} />
      </section>

      {/* Bar Mode callout card */}
      <div className={styles.barModeCallout} role="complementary" aria-label="Bar Mode feature">
        <div className={styles.barModeCalloutContent}>
          <p className={styles.barModeHeadline}>Behind the bar?</p>
          <p className={styles.barModeSub}>
            Switch to Bar Mode for a clean 10-tile drink display — built for service.
          </p>
        </div>
        <Link href="/bar" className={styles.barModeBtn}>
          Enter Bar Mode →
        </Link>
      </div>

      {/* Featured cocktails */}
      <section
        className={styles.section}
        aria-labelledby="featured-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="featured-heading" className={styles.sectionTitle}>
            Classic Recipes
          </h2>
          <Link href="/cocktails" className={styles.viewAll}>
            View all →
          </Link>
        </div>
        <div className={styles.cocktailGrid}>
          {featured.map((cocktail) => (
            <CocktailCard key={cocktail.id} cocktail={cocktail} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
