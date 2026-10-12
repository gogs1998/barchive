/**
 * URL/ID slug for names. Dependency-free so client code (auth context,
 * onboarding) can use it without pulling in the cocktail dataset.
 * Must match apps/api/tools/backfill-ingredient-slugs.mjs.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")           // decompose accented chars (é → e + combining accent)
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
