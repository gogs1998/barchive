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
Build a **separate, ready-to-use** cocktail dataset from openly licensed sources only, with original wording and images BarIQ owns or may legally use. **Source it; don't replace anything.** The owner will decide later whether to switch over. A smaller, clean library is better than a big, risky one.

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

## SOURCE ONLY. Do not wire it in.
This job is to **gather and prepare** the open data. The owner will decide later whether and how to swap it in.
- **Do not** import `cocktails.open.ts` anywhere or change `COCKTAILS` in `cocktails.ts`.
- **Do not** delete or edit `cocktails.imported.ts`, `cocktails.diffords.ts`, the importers, `tools/diffords/`, or the curated `IMG` map.
- **Do not** change any app code, tests or config. The live site must be unaffected.
- Only add new files: the pipeline under `apps/web/tools/open-data/`, `cocktails.open.ts`, `cocktails.open.sources.json`, and images under `apps/web/public/img/cocktails/`. (If you prefer, keep everything under `apps/web/tools/open-data/out/` instead and don't touch `src/` or `public/` at all.)

## Done when
- Every recipe and image has a source and licence in `cocktails.open.sources.json`.
- `cocktails.open.ts` type-checks on its own (`npx tsc --noEmit` in `apps/web` still passes) and existing tests still pass (`npm run test`), proving nothing else changed.
- A short `apps/web/tools/open-data/REPORT.md` with: how many recipes sourced, how many have clean images, which classics from the current set are covered and which aren't, any licence questions, and how to re-run the pipeline.

## Don't
- Don't deploy.
- Don't touch `apps/api`, onboarding, CocktailIQ or any existing data.
- Don't push to `main`. Commit to `work/claude` or a new branch off it.
