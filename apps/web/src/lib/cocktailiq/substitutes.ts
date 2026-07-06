// src/lib/cocktailiq/substitutes.ts
import { SUBSTITUTIONS, type SubstituteEntry } from "../substitutions";
import { resolveCanonical, getSubstituteScores } from "./resolver";

/** Model scores run 0–6. Below this the suggestion is noise (bitters → "Fruit"/"Chocolate" at 0.5). */
const MIN_SCORE = 2;
/** Scores at/above this are close enough to call a "close" match. */
const CLOSE_SCORE = 3;

function titleCase(s: string): string {
  // Unicode-aware: uppercase the first letter of each whitespace token only,
  // so accents/apostrophes aren't treated as word boundaries (cf. P0-4).
  return s.replace(/(^|\s)(\p{L})/gu, (_m, sp, ch) => sp + ch.toUpperCase());
}

function parityForScore(score: number): SubstituteEntry["parity"] {
  return score >= CLOSE_SCORE ? "close" : "different";
}

/**
 * Curated overrides keyed by resolver canonical name, so that varied source
 * spellings ("Bourbon Whiskey", "Cognac (Brandy)") reach the same entries as
 * the display-name key ("Bourbon", "Cognac"). First key that resolves wins.
 */
const curatedByCanonical: Map<string, SubstituteEntry[]> = (() => {
  const m = new Map<string, SubstituteEntry[]>();
  for (const [key, entries] of Object.entries(SUBSTITUTIONS)) {
    const canon = resolveCanonical(key);
    if (canon && !m.has(canon)) m.set(canon, entries);
  }
  return m;
})();

/** Look up a curated entry: exact name, case-insensitive, then via canonical. */
function curatedFor(name: string): SubstituteEntry[] | undefined {
  if (SUBSTITUTIONS[name]) return SUBSTITUTIONS[name];
  const key = Object.keys(SUBSTITUTIONS).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  if (key) return SUBSTITUTIONS[key];

  const canon = resolveCanonical(name);
  if (canon && curatedByCanonical.has(canon)) return curatedByCanonical.get(canon);
  return undefined;
}

/**
 * Substitutes for an ingredient: hand-curated entries win; otherwise fall back
 * to CocktailIQ's substitution model, filtered to suppress low-score noise.
 * Returns [] when nothing worthwhile is known.
 */
export function getSubstitutesFor(ingredientName: string, topK = 4): SubstituteEntry[] {
  const curated = curatedFor(ingredientName);
  if (curated && curated.length) return curated;

  const canonical = resolveCanonical(ingredientName);
  if (!canonical) return [];

  return getSubstituteScores(canonical)
    .filter(([name]) => name.toLowerCase() !== canonical.toLowerCase())
    .filter(([, score]) => score >= MIN_SCORE)
    .slice(0, topK)
    .map(([name, score]) => ({
      name: titleCase(name),
      note: "Suggested by CocktailIQ flavor model",
      parity: parityForScore(score),
    }));
}
