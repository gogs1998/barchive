import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getIngredients } from "@/lib/api";
import styles from "./page.module.css";

export const metadata = {
  title: "Cocktail Ingredients A–Z — BarIQ",
  description:
    "Every bar ingredient on BarIQ, A to Z: what uses it and what you can use instead.",
  alternates: { canonical: "/ingredients" },
};

export default async function IngredientsPage() {
  const ingredients = await getIngredients();

  // Group alphabetically
  const groups: Record<string, typeof ingredients> = {};
  for (const ing of ingredients) {
    const letter = ing.name[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(ing);
  }
  const sortedLetters = Object.keys(groups).sort();

  return (
    <PageShell active="ingredients">
      {/* Heading */}
      <div className={styles.heading}>
        <h1 className={styles.title}>Ingredients</h1>
        <span className={styles.count}>{ingredients.length} ingredients</span>
      </div>

      {/* Alphabet jump nav */}
      <nav className={styles.alphaNav} aria-label="Jump to letter">
        {sortedLetters.map((letter) => (
          <a key={letter} href={`#letter-${letter}`} className={styles.alphaLink}>
            {letter}
          </a>
        ))}
      </nav>

      {/* Grouped list: links only. The cocktails for each ingredient live on
          its own page, which keeps this hub small. */}
      <div className={styles.groups}>
        {sortedLetters.map((letter) => (
          <section
            key={letter}
            id={`letter-${letter}`}
            aria-labelledby={`heading-${letter}`}
            className={styles.group}
          >
            <h2 id={`heading-${letter}`} className={styles.letter}>
              {letter}
            </h2>
            <ul className={styles.ingredientLinks} role="list">
              {groups[letter].map((ing) => (
                <li key={ing.name}>
                  <Link
                    href={`/ingredients/${ing.slug}`}
                    className={styles.ingredientName}
                  >
                    {ing.name}
                  </Link>
                  <span className={styles.ingredientCount}>{ing.cocktailCount}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
