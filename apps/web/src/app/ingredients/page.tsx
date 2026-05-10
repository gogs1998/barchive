import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getIngredients } from "@/lib/api";
import styles from "./page.module.css";

export const metadata = {
  title: "Ingredients — BarIQ",
  description: "Full index of bar ingredients used across 80+ classic cocktail recipes.",
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

      {/* Grouped list */}
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
            <ul className={styles.ingredientList} role="list">
              {groups[letter].map((ing) => (
                <li key={ing.name} className={styles.ingredientItem}>
                  <div className={styles.ingredientName}>{ing.name}</div>
                  <div className={styles.cocktailLinks} aria-label={`Cocktails using ${ing.name}`}>
                    {ing.cocktails.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/cocktails/${c.slug}`}
                        className={styles.cocktailLink}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
