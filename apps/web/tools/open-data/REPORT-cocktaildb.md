# TheCocktailDB dataset

Separate from the live library. Nothing here is imported by the app.

Licence: TheCocktailDB Premium API key (lifetime, bought 2026-10-11). Data pulled only through
the official V2 API, never scraped. Their terms require this credit wherever it is shown:

> Recipe data and imagery: TheCocktailDB (https://www.thecocktaildb.com/)

## Counts

- Recipes: 636 (from 637 drinks in the API).
- Non-alcoholic: 58.
- With an image: 93. Only images TheCocktailDB marks `strCreativeCommonsConfirmed: Yes` are used.
- Without an image: 543. Their image URLs are kept in the sources file in case
  you decide to use them later, but they are not used here.
- Overlap with your 79 curated cocktails (same slug): 52.
- Overlap with Grok's 102 IBA cocktails (same slug): 68.
- New, in neither set: 558.

## By category

- Liqueur: 120
- Rum: 105
- Vodka: 100
- Gin: 97
- Mocktail: 57
- Whiskey: 50
- Tequila: 29
- Wine: 29
- Brandy: 28
- Other: 12
- Beer: 8
- Mezcal: 1

## Ingredient names

1625 ingredient lines were mapped to the bar vocabulary used by onboarding (so "What Can I
Make?" matches). 921 kept TheCocktailDB's own name, title-cased. Those will not match the
starter bar until more aliases are added to `lib/normalize.mjs`.

## Notes

- Method text is TheCocktailDB's own instructions, shown under their licence with credit.
  It is not rewritten.
- Measures use the same parser as the fixed importer: ml first, batch pours over 250 ml are
  display-only, brand names stripped from amounts.
- Image URLs point at thecocktaildb.com, which their terms allow (use the `strDrinkThumb` URL).
  Self-hosting them is an option later.

## Re-run

From `apps/web/tools/open-data` (needs `.env` with `COCKTAILDB_KEY`):

```
node fetch-cocktaildb.mjs     # download via API into raw/cocktaildb (--refresh to redownload)
node build-cocktaildb.mjs     # write the module, sources file and this report
```
