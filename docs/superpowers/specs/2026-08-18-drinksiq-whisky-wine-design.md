# WhiskyIQ + WineIQ — Design Spec (DrinksIQ knowledge add-ons)

**Date:** 2026-08-18
**Branch:** `work/claude`
**Status:** DESIGN ONLY (owner asked to design, not build yet). Open-data backbone chosen.

## Concept

Extend BarIQ from a cocktail app into a **drinks-knowledge platform** by adding two
expert reference/education add-ons — **WhiskyIQ** and **WineIQ** — following the "IQ" pattern
established by CocktailIQ.

Key difference from CocktailIQ: CocktailIQ was *computation over data we already had*.
WhiskyIQ/WineIQ are **reference/education** products whose entire value is the **quality and
authority of the content**. So the design centers on a trustworthy content pipeline, not an
algorithm. Per the owner's decision, content is built on an **open-data backbone**
(Wikidata + Wikipedia) — accurate, attributable facts as the skeleton, hand-polished into
expert-framed guides.

## Shared framework: "DrinksIQ"

Whisky and wine are the same *shape* of product (a browsable knowledge base of
entities + education + a flavour/structure model + cross-links into BarIQ). Build them on one
shared framework so the second is largely a re-instantiation of the first:

- A generic **KnowledgeSection** pattern: landing → category index → entity detail → education
  articles → glossary, over a typed static dataset.
- Shared UI primitives (cards, profile layout, flavour/structure meter, glossary, search)
  parameterised per domain, reusing `PageShell` and existing design tokens.
- Two datasets (`whisky`, `wine`) + two route trees (`/whisky/*`, `/wine/*`).

This spec designs the framework once and both instances.

## Content model — WhiskyIQ

Entities & pages:
- **Styles / regions** (the spine): Scotch — Speyside, Islay, Highland, Lowland, Campbeltown;
  Irish; American Bourbon; Rye; Tennessee; Japanese; Canadian; World/other. Each: description,
  typical flavour profile, defining rules (e.g. bourbon ≥51% corn), notable distilleries.
- **Distilleries** (directory): name, region, country, founded, owner, status
  (operating/closed/mothballed), signature expressions, flavour profile, short summary. Wikidata
  has a good set of whisky distilleries with these attributes.
- **Education articles:** How to taste (nose/palate/finish, adding water), cask types
  (ex-bourbon, sherry, port, virgin oak), age statements & NAS, cask strength & ABV, chill
  filtration & colouring, single malt vs blend vs single grain, the whisky glossary.
- **Flavour map:** position styles/distilleries on axes (peat/smoke, sherry/fruit, body,
  spice) — a lightweight version of the classic whisky flavour map, driven by the dataset.
- **Serving & pairing:** neat / rocks / water / highball; whisky in cocktails → deep-links back
  into BarIQ recipes that use that whisky style.

## Content model — WineIQ

Entities & pages:
- **Grapes** (directory): variety, colour (red/white/etc.), description, typical flavours,
  body/tannin/acidity tendencies, key regions, classic food pairings. Wikidata has grape
  varieties with colour + regions.
- **Regions / appellations:** Bordeaux, Burgundy, Champagne, Rhône, Rioja, Tuscany, Napa,
  Barossa, Mosel, etc. — country, climate, signature grapes & styles, notable sub-appellations.
- **Education articles:** Wine structure (tannin, acidity, sweetness, body, alcohol), how to
  taste (look/smell/taste), service (temperature by style, glassware, decanting, storage),
  wine types (still/sparkling/fortified/rosé/orange), reading a label, the wine glossary.
- **Structure model:** per grape/style, a small structure profile (tannin/acidity/body/sweetness)
  rendered as a meter — the WineIQ analogue of the whisky flavour map.
- **Food pairing:** a simple pairing framework (by structure) + per-grape suggestions.

## Open-data backbone (sources, queries, licensing)

Facts skeleton (built at build time, then hand-polished):
- **Wikidata (CC0 — free, no attribution required):** the primary structured source via SPARQL.
  - Whisky distilleries: `?d wdt:P31/wdt:P279* wd:Q10373548` (distillery) filtered to whisky;
    pull label, country (P17), location/region, inception (P571), owner (P127), website (P856),
    image (P18), Wikipedia sitelink.
  - Grape varieties: `?g wdt:P31 wd:Q10978` (grape variety); label, colour (P462), wine region
    (P1?), image, sitelink.
  - Wine regions / appellations: `wd:Q1770935` (wine appellation) / wine region classes; label,
    country, image, sitelink.
- **Wikipedia REST summary API (CC BY-SA — attribution + share-alike required):** short
  descriptive summaries per entity (`/api/rest_v1/page/summary/<title>`). Store the summary +
  a source link; **attribute** ("Summary from Wikipedia, CC BY-SA") on every page that uses it.
  Prefer *facts + short summaries with attribution* over copying large prose; paraphrase the
  education articles rather than lifting text.
- **Education articles** (how-to-taste, structure, service, glossaries): authored/paraphrased
  from general knowledge, not copied — these are the "expert framing" layer over the facts.

Licensing rules baked into the design:
- Wikidata facts: use freely (CC0).
- Wikipedia summaries/images: display attribution + link; keep excerpts short; note image
  licences (many Commons images are CC BY-SA / need credit) — or skip images we can't clearly
  attribute and use a neutral placeholder.
- A `sources` field on every entity records provenance for auditability + attribution.

## Data pipeline (build-time, mirrors the cocktail importers)

- `tools/drinksiq/fetch-wikidata.mjs` — runs the SPARQL queries, writes raw JSON to
  `tools/drinksiq/raw/` (gitignored, like the Difford's scrape).
- `tools/drinksiq/fetch-wikipedia.mjs` — for each entity sitelink, fetch the REST summary +
  image/licence, cache to raw.
- `tools/drinksiq/build-whisky.mjs` / `build-wine.mjs` — transform + hand-curation overrides →
  `apps/web/src/lib/whisky/*.ts` and `apps/web/src/lib/wine/*.ts` (typed static datasets,
  same pattern as `cocktails.imported.ts`). A committed `curation/*.json` holds manual
  corrections/additions (the "polish") so re-running fetch doesn't clobber expert edits.
- All content ships as static data → works with the static export, no runtime backend.

## Integration with BarIQ

- **Nav:** add "Whisky" and "Wine" to the header/mobile nav (currently Home / Cocktails /
  Bar Mode / Ingredients).
- **Cross-links:** a cocktail whose ingredients include a whisky/wine style links to the
  relevant WhiskyIQ/WineIQ profile; a spirit in "My Bar" links to its profile; a WhiskyIQ style
  page lists BarIQ cocktails using it. This is the glue that makes them feel like *add-ons*, not
  bolt-ons.
- **Reuse:** `PageShell`, design tokens, card/detail patterns, search, the flavour/structure
  meter idea (same shape as the CocktailIQ balance meter).

## Routes / UI

- `/whisky` (landing: styles grid + "how to taste" + flavour map + glossary link)
- `/whisky/style/[slug]`, `/whisky/distillery/[slug]`, `/whisky/learn/[article]`, `/whisky/glossary`
- `/wine` (landing: grapes + regions + structure + service)
- `/wine/grape/[slug]`, `/wine/region/[slug]`, `/wine/learn/[article]`, `/wine/glossary`
- All statically generated (SSG) like the cocktail/ingredient pages.

## MVP scope (Phase 1, if/when we build)

Start with **WhiskyIQ** (closest to the existing spirits world), prove the framework, then
re-instantiate for WineIQ.
- WhiskyIQ MVP: styles/regions guide (8–10 styles) + distillery directory (Wikidata set) +
  3–4 education articles + glossary + a basic flavour map + BarIQ cross-links.
- WineIQ (Phase 2): grapes (top ~30) + regions (top ~15) + structure model + service + glossary.

## "Expert / proper" — how we keep it credible
- Facts from Wikidata (verifiable, sourced). Summaries attributed to Wikipedia.
- Education layer authored/paraphrased with a **review gate** before publish (accuracy matters
  for an education product; no unreviewed AI prose shipped as "expert").
- Every entity carries `sources`; a visible "Sources" line per page.
- Corrections captured in `curation/` so the dataset improves over time without re-fetch loss.

## Risks / open questions (for a later build decision)
- **Content depth vs breadth:** how deep per entity for MVP (a paragraph + facts, or long-form)?
- **Images/licensing:** Commons image attribution is fiddly — may start text-only + placeholders.
- **Wikidata coverage/quality:** distillery/region completeness varies; curation fills gaps.
- **Effort:** the education articles + curation are the real work; the pipeline is straightforward.
- **Naming/brand:** "WhiskyIQ"/"WineIQ" as sub-brands under BarIQ, or a unified "DrinksIQ"?

## Out of scope (this design)
Building it (design-only per the owner); user-generated content (tasting notes/reviews);
purchase/price data; any paid API.
