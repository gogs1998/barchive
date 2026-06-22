// src/lib/cocktailiq/substitutes.ts
import { SUBSTITUTIONS, type SubstituteEntry } from "../substitutions";
import { resolveCanonical, getSubstituteScores } from "./resolver";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parityForScore(score: number): SubstituteEntry["parity"] {
  if (score >= 4) return "close";
  if (score >= 3) return "close";
  return "different";
}

/** Look up a curated entry (exact, then case-insensitive). */
function curatedFor(name: string): SubstituteEntry[] | undefined {
  if (SUBSTITUTIONS[name]) return SUBSTITUTIONS[name];
  const key = Object.keys(SUBSTITUTIONS).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? SUBSTITUTIONS[key] : undefined;
}

/**
 * Substitutes for an ingredient: hand-curated entries win; otherwise fall back
 * to CocktailIQ's substitution model. Returns [] when nothing is known.
 */
export function getSubstitutesFor(ingredientName: string, topK = 4): SubstituteEntry[] {
  const curated = curatedFor(ingredientName);
  if (curated && curated.length) return curated;

  const canonical = resolveCanonical(ingredientName);
  if (!canonical) return [];

  return getSubstituteScores(canonical)
    .filter(([name]) => name.toLowerCase() !== canonical.toLowerCase())
    .slice(0, topK)
    .map(([name, score]) => ({
      name: titleCase(name),
      note: "Suggested by CocktailIQ flavor model",
      parity: parityForScore(score),
    }));
}
