import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import RecipeScaler from "@/components/RecipeScaler";
import { FavouriteButton } from "@/components/FavouriteButton";
import { JsonLd } from "@/components/JsonLd";
import { getCocktail } from "@/lib/api";
import { COCKTAILS } from "@/lib/cocktails";
import {
  COCKTAILDB_CREDIT_TEXT,
  COCKTAILDB_URL,
  breadcrumbJsonLd,
  isIndexable,
  needsCocktailDbCredit,
  recipeDescription,
  recipeJsonLd,
  spiritPath,
  spiritTitle,
} from "@/lib/seo";
import styles from "./page.module.css";
import { BalanceMeter } from "@/components/BalanceMeter";
import { FlavorSciencePanel } from "@/components/FlavorSciencePanel";
import { cocktailToBuild, isBalanceEligible } from "@/lib/cocktailiq/adapter";
import { calculateBalance } from "@/lib/cocktailiq/balance";
import { getSubstitutesFor } from "@/lib/cocktailiq/substitutes";
import type { SubstituteEntry } from "@/lib/substitutions";

interface Props {
  params: { slug: string };
}

/** Generate static paths for all cocktails */
export async function generateStaticParams() {
  return COCKTAILS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cocktail = await getCocktail(params.slug);
  if (!cocktail) return {};
  return {
    title: `${cocktail.name} Recipe — BarIQ`,
    description: recipeDescription(cocktail),
    alternates: { canonical: `/cocktails/${cocktail.slug}` },
    // Difford's-sourced recipes stay browsable but out of the index.
    ...(isIndexable(cocktail) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function CocktailDetailPage({ params }: Props) {
  const cocktail = await getCocktail(params.slug);
  if (!cocktail) notFound();

  const substitutesByIngredient: Record<string, SubstituteEntry[]> = {};
  for (const ing of cocktail.ingredients) {
    const subs = getSubstitutesFor(ing.name);
    if (subs.length) substitutesByIngredient[ing.name] = subs;
  }

  const balanceScores = isBalanceEligible(cocktail)
    ? calculateBalance(cocktailToBuild(cocktail))
    : null;

  const stats = [
    { label: "ABV", value: cocktail.abv },
    { label: "Time", value: cocktail.time },
    { label: "Glass", value: cocktail.glass },
    { label: "Category", value: cocktail.category },
  ].filter((s) => s.value);

  return (
    <PageShell active="cocktails">
      {isIndexable(cocktail) && <JsonLd data={recipeJsonLd(cocktail)} />}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Cocktails", path: "/cocktails" },
          { name: spiritTitle(cocktail.category), path: spiritPath(cocktail.category) },
          { name: cocktail.name, path: `/cocktails/${cocktail.slug}` },
        ])}
      />

      {/* Back link */}
      <Link href="/cocktails" className={styles.back}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        All Cocktails
      </Link>

      <article className={styles.article}>

        {/* Hero image — falls back to the drink's colour wash when no image */}
        <div
          className={styles.hero}
          style={cocktail.img ? undefined : { backgroundColor: cocktail.color }}
        >
          {cocktail.img && (
            <Image
              src={cocktail.img}
              alt={`${cocktail.name} cocktail`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={styles.heroImg}
            />
          )}
          <div className={styles.heroOverlay} />

          {/* Category + name on top of image */}
          <div className={styles.heroText}>
            <p className={styles.category}>
              <Link href={spiritPath(cocktail.category)} className={styles.categoryLink}>
                {cocktail.category}
              </Link>{" "}
              · {cocktail.glass}
            </p>
            <div className={styles.heroTitleRow}>
              <h1 className={styles.name}>{cocktail.name}</h1>
              <FavouriteButton slug={cocktail.slug} recipeName={cocktail.name} size="detail" />
            </div>
            {/* Metadata chips */}
            <div className={styles.metaChips} aria-label="Recipe metadata">
              {cocktail.abv && (
                <span className={styles.metaChip}>{cocktail.abv}</span>
              )}
              {cocktail.time && (
                <span className={styles.metaChip}>{cocktail.time}</span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className={styles.details}>
          {/* Stats */}
          <div className={styles.stats} role="list" aria-label="Cocktail stats">
            {stats.map(({ label, value }) => (
              <div key={label} className={styles.stat} role="listitem">
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{value}</span>
              </div>
            ))}
          </div>

          {/* Dietary flags */}
          <div className={styles.flags} aria-label="Dietary info">
            {cocktail.vegan && (
              <span className={styles.flag}>Vegan</span>
            )}
            {cocktail.glutenFree && (
              <span className={styles.flag}>Gluten-free</span>
            )}
            {cocktail.lowAbv && (
              <span className={styles.flag}>Low ABV</span>
            )}
          </div>

          {/* Tags */}
          {cocktail.tags.length > 0 && (
            <div className={styles.tags} aria-label="Tags">
              {cocktail.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Two-column layout: ingredients + steps */}
          <div className={styles.recipe}>
            {/* Ingredients with batch scaler */}
            <div className={styles.ingredientsSection}>
              <RecipeScaler
                ingredients={cocktail.ingredients}
                substitutesByIngredient={substitutesByIngredient}
              />
            </div>

            {/* Method */}
            <section
              className={styles.stepsSection}
              aria-labelledby="method-heading"
            >
              <h2 id="method-heading" className={styles.sectionTitle}>
                Method
              </h2>
              <ol className={styles.stepList}>
                {cocktail.steps.map((step, i) => (
                  <li key={i} className={styles.step}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {balanceScores && (
            <FlavorSciencePanel
              rating={balanceScores.rating}
              overall={balanceScores.overall}
            >
              <BalanceMeter scores={balanceScores} />
            </FlavorSciencePanel>
          )}

          {needsCocktailDbCredit(cocktail) && (
            <p className={styles.credit}>
              {COCKTAILDB_CREDIT_TEXT} (
              <a href={COCKTAILDB_URL} rel="noopener" target="_blank">
                thecocktaildb.com
              </a>
              )
            </p>
          )}
        </div>
      </article>
    </PageShell>
  );
}
