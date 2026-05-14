"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./CategoryGrid.module.css";

// Hero-tier spirits — promoted to larger cards
const HERO_SPIRITS = new Set(["Gin", "Rum", "Tequila", "Vodka", "Whiskey"]);

// Inline SVG icons per spirit (20×20, stroke #C89B5C)
function SpiritIcon({ category }: { category: string }) {
  const stroke = "#C89B5C";
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (category) {
    case "Whiskey":
      return (
        <svg {...props}>
          <ellipse cx="10" cy="5" rx="5" ry="2" />
          <ellipse cx="10" cy="15" rx="5" ry="2" />
          <line x1="5" y1="5" x2="5" y2="15" />
          <line x1="15" y1="5" x2="15" y2="15" />
          <path d="M4 10 Q10 12 16 10" />
          <path d="M4 10 Q10 8 16 10" />
        </svg>
      );
    case "Gin":
      return (
        <svg {...props}>
          <circle cx="10" cy="7" r="2.5" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="14" cy="12" r="2" />
          <line x1="10" y1="9.5" x2="8" y2="10.5" />
          <line x1="10" y1="9.5" x2="12" y2="10.5" />
          <line x1="10" y1="9.5" x2="10" y2="17" />
        </svg>
      );
    case "Rum":
      return (
        <svg {...props}>
          <line x1="10" y1="2" x2="10" y2="18" />
          <line x1="10" y1="5" x2="14" y2="3" />
          <line x1="10" y1="8" x2="6" y2="6" />
          <line x1="10" y1="11" x2="14" y2="9" />
          <line x1="10" y1="14" x2="6" y2="12" />
        </svg>
      );
    case "Tequila":
      return (
        <svg {...props}>
          <line x1="10" y1="18" x2="10" y2="8" />
          <path d="M10 11 Q6 8 3 9" />
          <path d="M10 11 Q14 8 17 9" />
          <path d="M10 14 Q7 11 5 13" />
          <path d="M10 14 Q13 11 15 13" />
          <circle cx="10" cy="7" r="1.5" />
        </svg>
      );
    case "Vodka":
      return (
        <svg {...props}>
          <line x1="10" y1="2" x2="10" y2="18" />
          <line x1="2" y1="10" x2="18" y2="10" />
          <line x1="4.3" y1="4.3" x2="15.7" y2="15.7" />
          <line x1="15.7" y1="4.3" x2="4.3" y2="15.7" />
          <circle cx="10" cy="10" r="2" />
        </svg>
      );
    case "Champagne":
      return (
        <svg {...props}>
          <path d="M7 2 L13 2 L11 11 L11 16 M9 16 L13 16" />
          <ellipse cx="10" cy="6" rx="1" ry="1.5" opacity="0.6" />
        </svg>
      );
    case "Brandy":
      return (
        <svg {...props}>
          <path d="M6 3 Q4 9 10 12 Q16 9 14 3 Z" />
          <line x1="10" y1="12" x2="10" y2="16" />
          <line x1="7" y1="16" x2="13" y2="16" />
        </svg>
      );
    case "Mezcal":
      return (
        <svg {...props}>
          <path d="M7 18 L8 8 L12 8 L13 18 Z" />
          <line x1="6.5" y1="8" x2="13.5" y2="8" />
          <path d="M9 5 Q10 3 11 5 Q12 3 13 5" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M5 3 L15 3 L11 11 L11 16 M8 16 L13 16" />
          <line x1="5" y1="3" x2="15" y2="3" />
        </svg>
      );
  }
}

interface CategoryGridProps {
  categories: string[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const [expanded, setExpanded] = useState(false);

  const heroCategories = categories.filter((c) => HERO_SPIRITS.has(c));
  const secondaryCategories = categories.filter((c) => !HERO_SPIRITS.has(c));

  return (
    <div>
      {/* Hero tier — always visible */}
      <div className={styles.heroGrid} role="list">
        {heroCategories.map((cat) => (
          <div key={cat} role="listitem">
            <Link
              href={`/cocktails?category=${encodeURIComponent(cat)}`}
              className={`${styles.categoryCard} ${styles.heroCard}`}
            >
              <SpiritIcon category={cat} />
              <span className={styles.categoryName}>{cat}</span>
            </Link>
          </div>
        ))}
      </div>

      {/* Secondary tier — collapsible */}
      <div
        className={styles.overflowWrap}
        style={
          {
            "--overflow-max-height": expanded ? "500px" : "0px",
          } as React.CSSProperties
        }
        {...(!expanded ? ({ inert: "" } as Record<string, string>) : {})}
      >
        <div className={styles.secondaryGrid} role="list">
          {secondaryCategories.map((cat) => (
            <div key={cat} role="listitem">
              <Link
                href={`/cocktails?category=${encodeURIComponent(cat)}`}
                className={styles.categoryCard}
              >
                <SpiritIcon category={cat} />
                <span className={styles.categoryName}>{cat}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        className={styles.toggleBtn}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Show fewer spirits ↑" : `Show all spirits (${secondaryCategories.length} more) ↓`}
      </button>
    </div>
  );
}
