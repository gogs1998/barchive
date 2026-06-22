import type { Cocktail } from "./cocktails";

/** True when every ingredient of the cocktail is present in the bar (lowercased names). */
export function isMakeable(cocktail: Cocktail, barNames: Set<string>): boolean {
  return cocktail.ingredients.every((i) => barNames.has(i.name.toLowerCase()));
}

/** Count cocktails fully makeable from the given bar. */
export function countMakeable(cocktails: Cocktail[], barNames: Set<string>): number {
  let n = 0;
  for (const c of cocktails) if (isMakeable(c, barNames)) n++;
  return n;
}
