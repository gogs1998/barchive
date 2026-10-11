import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { JsonLd } from "@/components/JsonLd";
import { getIngredient, getIngredients } from "@/lib/api";
import { getSubstitutesFor } from "@/lib/cocktailiq/substitutes";
import { INGREDIENT_INDEX_MIN, breadcrumbJsonLd } from "@/lib/seo";
import styles from "./page.module.css";

interface Props {
  params: { slug: string };
}

const PARITY_LABEL = { equal: "Same result", close: "Close match", different: "Changes the drink" };

/** Generate static paths for all ingredients */
export async function generateStaticParams() {
  const ingredients = await getIngredients();
  return ingredients.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ingredient = await getIngredient(params.slug);
  if (!ingredient) return {};
  const n = ingredient.cocktailCount;
  const hasSubs = getSubstitutesFor(ingredient.name).length > 0;
  return {
    title: `${ingredient.name}: Cocktails${hasSubs ? " & Substitutes" : ""} — BarIQ`,
    description: `${n} cocktail${n !== 1 ? "s" : ""} made with ${ingredient.name}${
      hasSubs ? `, plus what to use instead of ${ingredient.name}` : ""
    }.`,
    alternates: { canonical: `/ingredients/${ingredient.slug}` },
    // Thin pages (few indexable cocktails) stay out of the index.
    ...(ingredient.indexableCount >= INGREDIENT_INDEX_MIN
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

export default async function IngredientDetailPage({ params }: Props) {
  const ingredient = await getIngredient(params.slug);
  if (!ingredient) notFound();

  const substitutes = getSubstitutesFor(ingredient.name);

  return (
    <PageShell active="ingredients">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Ingredients", path: "/ingredients" },
          { name: ingredient.name, path: `/ingredients/${ingredient.slug}` },
        ])}
      />

      {/* Back link */}
      <Link href="/ingredients" className={styles.back}>
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
        All Ingredients
      </Link>

      <article className={styles.article}>
        <div className={styles.header}>
          <h1 className={styles.name}>{ingredient.name}</h1>
          <p className={styles.count}>
            Used in {ingredient.cocktailCount} cocktail{ingredient.cocktailCount !== 1 ? "s" : ""}
          </p>
        </div>

        {substitutes.length > 0 && (
          <section aria-labelledby="subs-heading" className={styles.section}>
            <h2 id="subs-heading" className={styles.sectionTitle}>
              Substitutes for {ingredient.name}
            </h2>
            <ul className={styles.subList} role="list">
              {substitutes.map((s) => (
                <li key={s.name} className={styles.subItem}>
                  <span className={styles.subName}>
                    {s.name} · {PARITY_LABEL[s.parity]}
                  </span>
                  <span className={styles.subNote}>{s.note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {ingredient.cocktails.length > 0 ? (
          <section aria-labelledby="cocktails-heading">
            <h2 id="cocktails-heading" className={styles.sectionTitle}>
              Cocktails using {ingredient.name}
            </h2>
            <ul className={styles.cocktailList} role="list">
              {ingredient.cocktails.map((c) => (
                <li key={c.slug} className={styles.cocktailItem}>
                  <Link href={`/cocktails/${c.slug}`} className={styles.cocktailLink}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={styles.cocktailIcon}
                    >
                      <path d="M5 4h14l-2 9a4 4 0 0 1-4 3h-2a4 4 0 0 1-4-3L5 4z" />
                      <path d="M12 16v4M9 20h6" />
                    </svg>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className={styles.empty}>No cocktails found for this ingredient.</p>
        )}
      </article>
    </PageShell>
  );
}
