/** Same slug rules as apps/web/src/lib/cocktails.ts slugify(). */

export function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function tidyName(name) {
  return name.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}