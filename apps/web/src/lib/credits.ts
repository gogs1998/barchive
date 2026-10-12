/**
 * Image credits for recipe photos. Server-only: imports the per-recipe source
 * files, which must not end up in the client bundle (seo.ts is reachable from
 * client code via api.ts).
 */

import type { Cocktail } from "./cocktails";
import OPEN_SOURCES from "./cocktails.open.sources.json";
import COCKTAILDB_SOURCES from "./cocktails.cocktaildb.sources.json";

export interface ImageCredit {
  author: string;
  licence: string | null;
  sourceUrl: string | null;
}

type OpenSource = {
  imageAuthor?: string | null;
  imageLicence?: string | null;
  imageSourceUrl?: string | null;
};
type CocktailDbSource = {
  image: { used: boolean; attribution: string | null; source: string | null };
};

/**
 * Photo credit for a recipe image, where the image's licence requires one
 * (Wikimedia Commons CC BY / BY-SA for the IBA set; Creative Commons images on
 * TheCocktailDB). Null when no credit is needed or none is recorded.
 */
export function imageCredit(c: Pick<Cocktail, "slug" | "img" | "id">): ImageCredit | null {
  if (!c.img) return null;
  if (c.img.startsWith("/img/cocktails/")) {
    const s = (OPEN_SOURCES as Record<string, OpenSource>)[c.slug];
    if (s?.imageAuthor) {
      return {
        author: s.imageAuthor,
        licence: s.imageLicence ?? null,
        sourceUrl: s.imageSourceUrl ?? null,
      };
    }
    return null;
  }
  if (c.id.startsWith("cdb-")) {
    const s = (COCKTAILDB_SOURCES as Record<string, CocktailDbSource>)[c.slug];
    if (s?.image.used && s.image.attribution) {
      return { author: s.image.attribution, licence: null, sourceUrl: s.image.source };
    }
  }
  return null;
}
