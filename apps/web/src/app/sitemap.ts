import type { MetadataRoute } from "next";
import { COCKTAILS } from "@/lib/cocktails";
import { getIngredients } from "@/lib/api";
import {
  CONTENT_UPDATED,
  INGREDIENT_INDEX_MIN,
  absoluteUrl,
  getSpiritHubs,
  isIndexable,
  spiritPath,
} from "@/lib/seo";

export const dynamic = "force-static";

/**
 * Indexable pages only: no account/auth routes, no Difford's-sourced recipes,
 * no ingredient pages below the indexing threshold.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = CONTENT_UPDATED;
  const ingredients = await getIngredients();

  return [
    { url: absoluteUrl("/"), lastModified },
    { url: absoluteUrl("/cocktails"), lastModified },
    { url: absoluteUrl("/ingredients"), lastModified },
    ...getSpiritHubs().map((h) => ({ url: absoluteUrl(spiritPath(h.category)), lastModified })),
    ...COCKTAILS.filter(isIndexable).map((c) => ({
      url: absoluteUrl(`/cocktails/${c.slug}`),
      lastModified,
    })),
    ...ingredients
      .filter((i) => i.indexableCount >= INGREDIENT_INDEX_MIN)
      .map((i) => ({ url: absoluteUrl(`/ingredients/${i.slug}`), lastModified })),
  ];
}
