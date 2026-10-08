# Grok Brief: Rebuild BarIQ's cocktail data from open sources

**Repo:** `D:\VM\BarIQ PC\barchive` (GitHub `gogs1998/barchive`, branch `work/claude`)
**Live site:** https://bariq.co.uk (Cloudflare Pages project `barchive`)

## Why
BarIQ's library (~3,468 cocktails) is live, and most of it carries copyright risk:
- **~3,156 recipes scraped from Difford's Guide** (commercial site). Ingredient lists are facts, but the method/description wording and the scraping itself (against their ToS) are the exposure.
- **~440 from TheCocktailDB**: free for non-commercial use only. A live product needs a paid key.
- **Every image is hot-linked** from `cdn.diffordsguide.com` or `thecocktaildb.com`. This is the most clear-cut problem.
- The **79 hand-curated** recipes in `cocktails.ts` (the `C(...)` entries) are fine to keep, but their images in the `IMG` map also point at TheCocktailDB/Unsplash and need replacing.

## Goal
Replace the Difford's and TheCocktailDB data with a dataset built only from openly licensed sources, with original wording and images BarIQ owns or may legally use. A smaller, clean library is better than a big, risky one.

## Sources (allowed)
- **Wikidata** (CC0): cocktail entities, ingredients, IBA status, glass.
- **Wikipedia** (CC BY-SA): facts and short descriptions. Store attribution.
- **IBA official cocktail list**: the standard specs (ingredient + amount) are facts.
- **Open datasets** only if the licence is clearly permissive (CC0 / CC BY / MIT / ODbL). Record the licence.

**Not allowed:** Difford's Guide, TheCocktailDB, Liquor.com, Punch, or any site without an explicit open licence. Do not copy instruction text verbatim from anywhere.

## Recipes
- Ingredient names and amounts can come from the sources above (facts).
- **Write all method/steps in original words.** Short and practical, 3 to 6 steps.
- Normalise ingredient names to the vocabulary already used in `apps/web/src/lib/onboarding-ingredients.ts` and the curated set (e.g. "Lime Juice", "Sugar Syrup (2:1)", "Blanco Tequila") so "What Can I Make?" still matches.

## Images
- Use **Wikimedia Commons** images only with a compatible licence (CC0 / CC BY / CC BY-SA). Store author, licence and source URL.
- Or **generate original images** (BarIQ owns them).
- **Self-host** under `apps/web/public/img/cocktails/<slug>.webp`. No hot-linking.
- If no clean image exists, use `img: ""`. The UI already falls back to a colour card.

## Output format
Write a generated module, e.g. `apps/web/src/lib/cocktails.open.ts`, exporting `OPEN_COCKTAILS: Cocktail[]` in the existing shape (see `apps/web/src/lib/cocktails.ts`):

```ts
{ id, name, category, glass, img, color, ingredients: [{ name, amount, qty, unit }],
  steps, tags, abv, time, vegan, glutenFree, lowAbv, slug }
```

Add `apps/web/src/lib/cocktails.open.sources.json` with, per slug: recipe source URL(s), recipe licence, image source URL, image author, image licence.

Put the pipeline in `apps/web/tools/open-data/` (fetch, normalise, build) so it can be re-run. Keep raw downloads in a gitignored `raw/` folder.

## Wiring it in
In `apps/web/src/lib/cocktails.ts`, `COCKTAILS` is currently
`mergeUnique(CURATED_COCKTAILS, IMPORTED_COCKTAILS, DIFFORDS_COCKTAILS)`. Change it to
`mergeUnique(CURATED_COCKTAILS, OPEN_COCKTAILS)`.

Then delete `cocktails.imported.ts`, `cocktails.diffords.ts`, `tools/import-cocktaildb.mjs`, `tools/import-diffords.mjs` and `tools/diffords/`, and replace the third-party URLs in the curated `IMG` map.

## Done when
- No `diffordsguide.com` or `thecocktaildb.com` string anywhere in `apps/web/src` or the built `apps/web/out` (`grep -r` to confirm).
- Every recipe and image in `cocktails.open.sources.json` has a source and licence.
- `cd apps/web && npm run test` and `npx tsc --noEmit` pass. Some tests check that specific drinks exist (Whiskey Sour, White Russian, Negroni, Piña Colada, Margarita, Irish Coffee, Grasshopper), so keep those classics.
- Build works. Building on the network share fails at the `out/` copy step (EPERM), so copy `apps/web` to a local temp folder and build there.

## Don't
- Don't deploy. The owner will review and deploy.
- Don't touch `apps/api` (the auth Worker) or the onboarding/CocktailIQ code beyond what the data swap needs.
- Don't push to `main`. Work on `work/claude` or a new branch off it.
