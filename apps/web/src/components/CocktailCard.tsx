import Link from "next/link";
import Image from "next/image";
import type { Cocktail } from "@/lib/cocktails";
import { IngredientBadge } from "./IngredientBadge";
import styles from "./CocktailCard.module.css";

interface CocktailCardProps {
  cocktail: Cocktail;
  /** Show ingredient badges below the card title */
  showIngredients?: boolean;
}

export function CocktailCard({
  cocktail,
  showIngredients = false,
}: CocktailCardProps) {
  const keyIngredients = cocktail.ingredients.slice(0, 3);

  return (
    <Link
      href={`/cocktails/${cocktail.slug}`}
      className={styles.card}
      aria-label={`${cocktail.name} — ${cocktail.category}`}
    >
      {/* Thumbnail */}
      <div className={styles.thumbnail} aria-hidden="true">
        <Image
          src={cocktail.img}
          alt={`${cocktail.name} cocktail`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={styles.thumbnailImg}
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className={styles.overlay} />

        {/* Category pill */}
        <span className={styles.categoryPill}>{cocktail.category}</span>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <h3 className={styles.name}>{cocktail.name}</h3>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 4h14l-2 9a4 4 0 0 1-4 3h-2a4 4 0 0 1-4-3L5 4z" />
              <path d="M12 16v4M9 20h6" />
            </svg>
            {cocktail.glass}
          </span>
          <span className={styles.metaItem}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {cocktail.time}
          </span>
        </div>

        {showIngredients && (
          <div className={styles.ingredients} aria-label="Key ingredients">
            {keyIngredients.map((ing) => (
              <IngredientBadge
                key={ing.name}
                name={ing.name}
                amount={ing.amount}
              />
            ))}
            {cocktail.ingredients.length > 3 && (
              <span className={styles.moreIngredients}>
                +{cocktail.ingredients.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
