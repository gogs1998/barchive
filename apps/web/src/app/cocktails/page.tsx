import { Suspense } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { CocktailsClient } from "./CocktailsClient";
import { getCocktails, getCategories, getGlasses } from "@/lib/api";
import { getSpiritHubs, isIndexable, spiritPath } from "@/lib/seo";
import styles from "./directory.module.css";

export const metadata = {
  title: "Cocktail Recipes by Spirit — BarIQ",
  description:
    "Browse thousands of cocktail recipes by spirit: gin, rum, tequila, whiskey, vodka and more, with measures, method and substitutions.",
  alternates: { canonical: "/cocktails" },
};

export default async function CocktailsPage() {
  // Fetch all data at build time; CocktailsClient reads ?category= and ?q=
  // from the URL client-side (useSearchParams), so it only renders in the
  // browser. The directory below is server-rendered so crawlers can reach
  // every recipe without running JavaScript.
  const [{ cocktails }, categories, glasses] = await Promise.all([
    getCocktails({ pageSize: 100000 }),
    getCategories(),
    getGlasses(),
  ]);

  // The browse grid only needs card-level fields; drop the (large) step lists
  // to keep the client payload small now that the library is thousands of drinks.
  const lightCocktails = cocktails.map((c) => ({ ...c, steps: [] as string[] }));

  const hubs = getSpiritHubs();

  return (
    <PageShell active="cocktails">
      <Suspense fallback={null}>
        <CocktailsClient
          initialCocktails={lightCocktails}
          categories={categories}
          glasses={glasses}
        />
      </Suspense>

      <section className={styles.directory} aria-labelledby="directory-heading">
        <h2 id="directory-heading" className={styles.title}>
          Cocktails by spirit
        </h2>
        <p className={styles.intro}>
          {cocktails.length.toLocaleString("en-GB")} recipes. Pick a spirit to see every
          cocktail made with it.
        </p>
        <ul className={styles.hubs} role="list">
          {hubs.map((hub) => (
            <li key={hub.slug}>
              <Link href={spiritPath(hub.category)} className={styles.hubLink}>
                {hub.title}
                <span className={styles.hubCount}>{hub.cocktails.length}</span>
              </Link>
            </li>
          ))}
        </ul>

        {hubs.map((hub) => {
          const featured = hub.cocktails.filter(isIndexable);
          if (!featured.length) return null;
          return (
            <section
              key={hub.slug}
              className={styles.group}
              aria-labelledby={`dir-${hub.slug}`}
            >
              <h3 id={`dir-${hub.slug}`} className={styles.heading}>
                <Link href={spiritPath(hub.category)}>{hub.title}</Link>
              </h3>
              <ul className={styles.links} role="list">
                {featured.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/cocktails/${c.slug}`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>
    </PageShell>
  );
}
