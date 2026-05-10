import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { IngredientBadge } from "@/components/IngredientBadge";
import { getCocktail } from "@/lib/api";
import { COCKTAILS } from "@/lib/cocktails";
import styles from "./page.module.css";

interface Props {
  params: { slug: string };
}

/** Generate static paths for all cocktails */
export async function generateStaticParams() {
  return COCKTAILS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const cocktail = await getCocktail(params.slug);
  if (!cocktail) return {};
  return {
    title: `${cocktail.name} Recipe — BarIQ`,
    description: `How to make a ${cocktail.name}. ${cocktail.ingredients.length} ingredients, ${cocktail.time}.`,
  };
}

export default async function CocktailDetailPage({ params }: Props) {
  const cocktail = await getCocktail(params.slug);
  if (!cocktail) notFound();

  return (
    <PageShell active="cocktails">
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

      <article className={styles.article} itemScope itemType="https://schema.org/Recipe">

        {/* Hero image */}
        <div className={styles.hero}>
          <Image
            src={cocktail.img}
            alt={`${cocktail.name} cocktail`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={styles.heroImg}
            itemProp="image"
          />
          <div className={styles.heroOverlay} />

          {/* Category + name on top of image */}
          <div className={styles.heroText}>
            <p className={styles.category}>
              {cocktail.category} · {cocktail.glass}
            </p>
            <h1 className={styles.name} itemProp="name">
              {cocktail.name}
            </h1>
          </div>
        </div>

        {/* Details */}
        <div className={styles.details}>
          {/* Stats */}
          <div className={styles.stats} role="list" aria-label="Cocktail stats">
            {[
              { label: "ABV", value: cocktail.abv },
              { label: "Time", value: cocktail.time },
              { label: "Glass", value: cocktail.glass },
              { label: "Category", value: cocktail.category },
            ].map(({ label, value }) => (
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
            {/* Ingredients */}
            <section
              className={styles.ingredientsSection}
              aria-labelledby="ingredients-heading"
            >
              <h2 id="ingredients-heading" className={styles.sectionTitle}>
                Ingredients
              </h2>
              <ul
                className={styles.ingredientList}
                itemProp="recipeIngredient"
                role="list"
              >
                {cocktail.ingredients.map((ing) => (
                  <li key={ing.name} className={styles.ingredientItem}>
                    <IngredientBadge name={ing.name} amount={ing.amount} />
                  </li>
                ))}
              </ul>
            </section>

            {/* Method */}
            <section
              className={styles.stepsSection}
              aria-labelledby="method-heading"
            >
              <h2 id="method-heading" className={styles.sectionTitle}>
                Method
              </h2>
              <ol
                className={styles.stepList}
                itemProp="recipeInstructions"
              >
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
        </div>
      </article>
    </PageShell>
  );
}
