# CocktailIQ Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a build-time "flavor science" layer to BarIQ — a toggle-able balance/harmony meter on cocktail detail pages plus data-driven ingredient substitutions — ported client-side from CocktailIQ.

**Architecture:** All CocktailIQ logic is pure TypeScript over four precomputed JSON files. The cocktail detail page (statically generated) computes balance scores and per-ingredient substitutes at build time and passes only the small results to the client, so the ~860 KB of data never enters the client bundle. The balance meter is gated to recipes it can fairly judge and revealed via an opt-in toggle.

**Tech Stack:** Next.js 14 (App Router, `output: 'export'`), TypeScript, CSS Modules, Vitest. No new npm dependencies (the donor's framer-motion is replaced with CSS).

**All paths below are relative to `apps/web/` unless absolute.** Run all commands from `apps/web/` (`cd "/d/VM/BarIQ PC/barchive/apps/web"`).

---

### Task 0: Copy and prepare the CocktailIQ data files

**Files:**
- Create: `src/lib/cocktailiq/data/ingredient_categories.json`
- Create: `src/lib/cocktailiq/data/flavordb_join.json`
- Create: `src/lib/cocktailiq/data/ingredient_aliases.json`
- Create: `src/lib/cocktailiq/data/substitution_scores.json` (generated: `substitution_model.json` minus the unused `embeddings` block)

- [ ] **Step 1: Create the data dir and copy three files as-is**

Run:
```bash
mkdir -p src/lib/cocktailiq/data
cp "/d/Cursor/CocktailIQ/claude/bartabiq/data/cocktailiq/ingredient_categories.json" src/lib/cocktailiq/data/
cp "/d/Cursor/CocktailIQ/claude/bartabiq/data/cocktailiq/flavordb_join.json" src/lib/cocktailiq/data/
cp "/d/Cursor/CocktailIQ/supernova/data/processed/ingredient_aliases.json" src/lib/cocktailiq/data/
```

- [ ] **Step 2: Generate the stripped substitution scores file**

Run (node needs a Windows-style path):
```bash
node -e "const m=require('D:/Cursor/CocktailIQ/claude/bartabiq/data/cocktailiq/substitution_model.json'); require('fs').writeFileSync('src/lib/cocktailiq/data/substitution_scores.json', JSON.stringify(m.substitution_scores));"
```

- [ ] **Step 3: Verify shapes and counts**

Run:
```bash
node -e "const c=require('./src/lib/cocktailiq/data/ingredient_categories.json');const s=require('./src/lib/cocktailiq/data/substitution_scores.json');const f=require('./src/lib/cocktailiq/data/flavordb_join.json');const a=require('./src/lib/cocktailiq/data/ingredient_aliases.json');console.log('cats',Object.keys(c.ingredients).length,'subs',Object.keys(s).length,'chem',Object.keys(f).length,'alias',Object.keys(a.alias_to_canonical).length);"
```
Expected: `cats 191 subs 191 chem 296 alias 324`

- [ ] **Step 4: Confirm tsconfig allows JSON imports**

Run:
```bash
node -e "const t=require('./tsconfig.json');console.log('resolveJsonModule:', t.compilerOptions.resolveJsonModule)"
```
Expected: `resolveJsonModule: true`. If it prints `undefined`, add `"resolveJsonModule": true` to `compilerOptions` in `tsconfig.json`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cocktailiq/data
git commit -m "feat(cocktailiq): add precomputed flavor-science data files"
```

---

### Task 1: Define CocktailIQ types

**Files:**
- Create: `src/lib/cocktailiq/types.ts`

- [ ] **Step 1: Write the types**

```typescript
// src/lib/cocktailiq/types.ts

/** The four balance groups the scorer reasons about. */
export type BalanceGroup = "base_spirit" | "citrus" | "sweetener" | "modifier";

/** One ingredient prepared for balance scoring. */
export interface BuildIngredient {
  /** Canonical CocktailIQ name, or a lowercased fallback when unresolved. */
  name: string;
  balanceGroup: BalanceGroup;
  /** Volume in millilitres (0 when the amount is non-numeric, e.g. a garnish). */
  volumeMl: number;
  /** FlavorDB compound names (empty when the ingredient is unknown). */
  compounds: string[];
}

export type BalanceRating = "Excellent" | "Good" | "Fair" | "Needs Work";

export interface BalanceScores {
  diversity: number;
  proportions: number;
  chemistry: number;
  harmony: number;
  overall: number;
  rating: BalanceRating;
  suggestions: string[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/cocktailiq/types.ts
git commit -m "feat(cocktailiq): add types"
```

---

### Task 2: Ingredient resolver

Maps barchive ingredient names ("White Rum", "Tequila Blanco") to CocktailIQ canonicals and exposes category/compound/substitute lookups.

**Files:**
- Create: `src/lib/cocktailiq/resolver.ts`
- Test: `src/lib/cocktailiq/resolver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/cocktailiq/resolver.test.ts
import { describe, it, expect } from "vitest";
import {
  resolveCanonical,
  getCategoryInfo,
  getCompounds,
  getSubstituteScores,
  mapToBalanceGroup,
} from "./resolver";

describe("resolveCanonical", () => {
  it("resolves via alias map", () => {
    expect(resolveCanonical("White Rum")).toBe("rum");
    expect(resolveCanonical("Fresh Lime Juice")).toBe("lime juice");
    expect(resolveCanonical("Cointreau")).toBe("triple sec");
  });
  it("resolves a direct vocabulary hit", () => {
    expect(resolveCanonical("Gin")).toBe("gin");
  });
  it("resolves by stripping qualifier words", () => {
    expect(resolveCanonical("Tequila Blanco")).toBe("tequila");
    expect(resolveCanonical("Reposado Tequila")).toBe("tequila");
  });
  it("returns null for unknown ingredients", () => {
    expect(resolveCanonical("Unicorn Tears")).toBeNull();
  });
});

describe("data lookups", () => {
  it("maps spirit to base_spirit", () => {
    expect(mapToBalanceGroup(getCategoryInfo("gin"))).toBe("base_spirit");
  });
  it("maps citrus juice to citrus via primary_category", () => {
    expect(mapToBalanceGroup(getCategoryInfo("lime juice"))).toBe("citrus");
  });
  it("maps sweetener to sweetener", () => {
    expect(mapToBalanceGroup(getCategoryInfo("simple syrup"))).toBe("sweetener");
  });
  it("maps everything else to modifier", () => {
    expect(mapToBalanceGroup(getCategoryInfo("triple sec"))).toBe("modifier");
    expect(mapToBalanceGroup(null)).toBe("modifier");
  });
  it("returns compounds and substitutes for a known ingredient", () => {
    expect(getCompounds("gin").length).toBeGreaterThan(0);
    expect(getSubstituteScores("gin").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/cocktailiq/resolver.test.ts`
Expected: FAIL — cannot find module `./resolver`.

- [ ] **Step 3: Implement the resolver**

```typescript
// src/lib/cocktailiq/resolver.ts
import aliasesJson from "./data/ingredient_aliases.json";
import categoriesJson from "./data/ingredient_categories.json";
import chemistryJson from "./data/flavordb_join.json";
import substitutionScores from "./data/substitution_scores.json";
import type { BalanceGroup } from "./types";

export interface CategoryInfo {
  primary_category: string;
  category_group: string;
}

const aliasMap = (aliasesJson as { alias_to_canonical: Record<string, string> })
  .alias_to_canonical;
const catMap = (categoriesJson as { ingredients: Record<string, CategoryInfo> })
  .ingredients;
const chemMap = chemistryJson as Record<string, { compounds?: string[] }>;
const subMap = substitutionScores as Record<string, [string, number][]>;

/** Qualifier words stripped when an exact match fails (e.g. "Tequila Blanco" -> "tequila"). */
const QUALIFIERS = new Set([
  "blanco", "reposado", "anejo", "añejo", "white", "dark", "gold", "golden",
  "light", "aged", "fresh", "dry", "sweet", "overproof", "spiced", "silver",
  "blended", "extra", "premium", "quality", "london",
]);

function inVocab(key: string): boolean {
  return Boolean(catMap[key] || subMap[key] || chemMap[key]);
}

function exact(name: string): string | null {
  const k = name.toLowerCase().trim();
  if (aliasMap[k]) return aliasMap[k];
  if (inVocab(k)) return k;
  return null;
}

/**
 * Resolve a free-text barchive ingredient name to a CocktailIQ canonical name.
 * Order: exact alias/vocab -> qualifier-stripped -> last word -> first word -> null.
 */
export function resolveCanonical(name: string): string | null {
  const direct = exact(name);
  if (direct) return direct;

  const words = name.toLowerCase().trim().split(/\s+/);
  const filtered = words.filter((w) => !QUALIFIERS.has(w));
  if (filtered.length && filtered.length < words.length) {
    const stripped = exact(filtered.join(" "));
    if (stripped) return stripped;
  }
  const last = exact(words[words.length - 1]);
  if (last) return last;
  const first = exact(words[0]);
  if (first) return first;
  return null;
}

export function getCategoryInfo(canonical: string): CategoryInfo | null {
  return catMap[canonical] ?? null;
}

export function getCompounds(canonical: string): string[] {
  return chemMap[canonical]?.compounds ?? [];
}

export function getSubstituteScores(canonical: string): [string, number][] {
  return subMap[canonical] ?? [];
}

/** Map a CocktailIQ category record to one of the four balance groups. */
export function mapToBalanceGroup(info: CategoryInfo | null): BalanceGroup {
  if (!info) return "modifier";
  if (info.category_group === "spirit") return "base_spirit";
  if (info.primary_category?.startsWith("juice_citrus")) return "citrus";
  if (info.category_group === "sweetener") return "sweetener";
  return "modifier";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/cocktailiq/resolver.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cocktailiq/resolver.ts src/lib/cocktailiq/resolver.test.ts
git commit -m "feat(cocktailiq): add ingredient resolver"
```

---

### Task 3: Balance scorer

Pure 4-dimension scorer ported from the donor (no data imports — operates on `BuildIngredient[]`).

**Files:**
- Create: `src/lib/cocktailiq/balance.ts`
- Test: `src/lib/cocktailiq/balance.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/cocktailiq/balance.test.ts
import { describe, it, expect } from "vitest";
import { calculateBalance } from "./balance";
import type { BuildIngredient } from "./types";

// A classic sour-style build: spirit + citrus + sweetener.
const margarita: BuildIngredient[] = [
  { name: "tequila", balanceGroup: "base_spirit", volumeMl: 60, compounds: ["a", "b", "c"] },
  { name: "lime juice", balanceGroup: "citrus", volumeMl: 30, compounds: ["b", "c", "d"] },
  { name: "triple sec", balanceGroup: "modifier", volumeMl: 22, compounds: ["c", "d", "e"] },
];

describe("calculateBalance", () => {
  it("returns a zeroed result for an empty build", () => {
    const s = calculateBalance([]);
    expect(s.overall).toBe(0);
    expect(s.rating).toBe("Needs Work");
  });

  it("scores a classic build well across dimensions", () => {
    const s = calculateBalance(margarita);
    expect(s.diversity).toBeGreaterThanOrEqual(70);
    expect(s.proportions).toBeGreaterThanOrEqual(70);
    expect(s.harmony).toBe(100);
    expect(s.overall).toBeGreaterThan(50);
    expect(["Excellent", "Good", "Fair"]).toContain(s.rating);
    expect(Array.isArray(s.suggestions)).toBe(true);
  });

  it("penalizes a single-ingredient build", () => {
    const s = calculateBalance([margarita[0]]);
    expect(s.harmony).toBeLessThan(60);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/cocktailiq/balance.test.ts`
Expected: FAIL — cannot find module `./balance`.

- [ ] **Step 3: Implement the scorer**

```typescript
// src/lib/cocktailiq/balance.ts
import type { BuildIngredient, BalanceScores, BalanceRating } from "./types";

/** 4-dimension flavor balance scorer (ported from CocktailIQ). Pure function. */
export function calculateBalance(ingredients: BuildIngredient[]): BalanceScores {
  if (ingredients.length === 0) {
    return {
      diversity: 0, proportions: 0, chemistry: 0, harmony: 0, overall: 0,
      rating: "Needs Work",
      suggestions: ["Add ingredients to start building your cocktail"],
    };
  }

  const diversity = calcDiversity(ingredients);
  const proportions = calcProportions(ingredients);
  const chemistry = calcChemistry(ingredients);
  const harmony = calcHarmony(ingredients);
  const overall =
    proportions * 0.3 + harmony * 0.25 + diversity * 0.25 + chemistry * 0.2;

  return {
    diversity, proportions, chemistry, harmony, overall,
    rating: getRating(overall),
    suggestions: suggest(ingredients, diversity, proportions, chemistry, harmony),
  };
}

function calcDiversity(ings: BuildIngredient[]): number {
  const count = new Set(ings.map((i) => i.balanceGroup)).size;
  if (count >= 3 && count <= 4) return 100;
  if (count === 2) return 70;
  if (count === 5) return 85;
  if (count > 5) return 60;
  return 40;
}

function calcProportions(ings: BuildIngredient[]): number {
  const total = ings.reduce((s, i) => s + i.volumeMl, 0);
  if (total === 0) return 0;

  const vol: Record<string, number> = {};
  for (const i of ings) vol[i.balanceGroup] = (vol[i.balanceGroup] || 0) + i.volumeMl;

  const spirit = (vol.base_spirit || 0) / total;
  const citrus = (vol.citrus || 0) / total;
  const sweet = (vol.sweetener || 0) / total;

  let score = 100;
  if (spirit < 0.4) score -= 20;
  else if (spirit > 0.75) score -= 25;
  else if (spirit >= 0.5 && spirit <= 0.65) score -= 0;
  else score -= 10;

  if (citrus > 0 && citrus < 0.15) score -= 10;
  else if (citrus > 0.4) score -= 15;

  if (sweet > 0 && sweet < 0.08) score -= 10;
  else if (sweet > 0.3) score -= 15;

  if (total < 45 || total > 180) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const s1 = new Set(a);
  const s2 = new Set(b);
  let inter = 0;
  for (const x of s1) if (s2.has(x)) inter++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function calcChemistry(ings: BuildIngredient[]): number {
  if (ings.length < 2) return 50;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < ings.length; i++) {
    for (let j = i + 1; j < ings.length; j++) {
      total += jaccard(ings[i].compounds, ings[j].compounds);
      pairs++;
    }
  }
  if (pairs === 0) return 50;
  return Math.min(100, (total / pairs) * 300);
}

function calcHarmony(ings: BuildIngredient[]): number {
  const count = ings.length;
  const groups = new Set(ings.map((i) => i.balanceGroup));
  let score: number;
  if (count < 2) score = 30;
  else if (count === 2) score = 60;
  else if (count >= 3 && count <= 5) score = 100;
  else if (count === 6) score = 80;
  else score = 60;
  if (!groups.has("base_spirit")) score -= 20;
  return Math.max(0, score);
}

function getRating(overall: number): BalanceRating {
  if (overall >= 80) return "Excellent";
  if (overall >= 65) return "Good";
  if (overall >= 50) return "Fair";
  return "Needs Work";
}

function suggest(
  ings: BuildIngredient[],
  diversity: number,
  proportions: number,
  chemistry: number,
  harmony: number
): string[] {
  const out: string[] = [];
  const total = ings.reduce((s, i) => s + i.volumeMl, 0);
  const groups = new Set(ings.map((i) => i.balanceGroup));

  if (diversity < 60) {
    if (!groups.has("citrus")) out.push("Add citrus (lime or lemon juice) for balance");
    if (!groups.has("sweetener") && groups.has("citrus"))
      out.push("Add sweetener (simple syrup) to balance acidity");
  }

  if (proportions < 70 && total > 0) {
    const vol: Record<string, number> = {};
    for (const i of ings) vol[i.balanceGroup] = (vol[i.balanceGroup] || 0) + i.volumeMl;
    const spiritPct = (vol.base_spirit || 0) / total;
    const citrusPct = (vol.citrus || 0) / total;
    if (spiritPct > 0.75) out.push("Too spirit-forward — add citrus or a modifier");
    else if (spiritPct < 0.4 && spiritPct > 0) out.push("Increase the base spirit for better balance");
    if (citrusPct > 0.4) out.push("Too much citrus — reduce it or add more spirit");
  }

  if (chemistry < 50) out.push("Try ingredients with more complementary flavor profiles");

  if (harmony < 60) {
    if (ings.length < 3) out.push("Add more ingredients for complexity (aim for 3–5)");
    else if (ings.length > 6) out.push("Quite complex — consider removing an ingredient");
  }

  if (out.length === 0) out.push("Well balanced.");
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/cocktailiq/balance.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cocktailiq/balance.ts src/lib/cocktailiq/balance.test.ts
git commit -m "feat(cocktailiq): add balance scorer"
```

---

### Task 4: Cocktail → build adapter + eligibility gate

**Files:**
- Create: `src/lib/cocktailiq/adapter.ts`
- Test: `src/lib/cocktailiq/adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/cocktailiq/adapter.test.ts
import { describe, it, expect } from "vitest";
import { cocktailToBuild, isBalanceEligible } from "./adapter";
import type { Cocktail } from "../cocktails";

function cocktail(partial: Partial<Cocktail>): Cocktail {
  return {
    id: "x", name: "X", category: "Gin", glass: "Coupe", img: "", color: "#000",
    ingredients: [], steps: [], tags: [], abv: "", time: "",
    vegan: false, glutenFree: false, lowAbv: false, slug: "x",
    ...partial,
  };
}

const margarita = cocktail({
  ingredients: [
    { name: "Tequila Blanco", amount: "2 oz", qty: 2, unit: "oz" },
    { name: "Fresh Lime Juice", amount: "1 oz", qty: 1, unit: "oz" },
    { name: "Cointreau", amount: "0.75 oz", qty: 0.75, unit: "oz" },
  ],
});

describe("cocktailToBuild", () => {
  it("converts qty/unit to ml and resolves balance groups", () => {
    const build = cocktailToBuild(margarita);
    expect(build[0].balanceGroup).toBe("base_spirit");
    expect(Math.round(build[0].volumeMl)).toBe(59); // 2 oz * 29.5735
    expect(build[1].balanceGroup).toBe("citrus");
    expect(build[0].compounds.length).toBeGreaterThan(0);
  });
  it("gives non-numeric amounts zero volume", () => {
    const c = cocktail({ ingredients: [{ name: "Salt", amount: "rim", qty: null, unit: null }] });
    expect(cocktailToBuild(c)[0].volumeMl).toBe(0);
  });
});

describe("isBalanceEligible", () => {
  it("is true for a classic 3-ingredient spirit drink", () => {
    expect(isBalanceEligible(margarita)).toBe(true);
  });
  it("is false for a single-ingredient build", () => {
    expect(isBalanceEligible(cocktail({ ingredients: [margarita.ingredients[0]] }))).toBe(false);
  });
  it("is false when there is no base spirit", () => {
    const mocktail = cocktail({
      ingredients: [
        { name: "Fresh Lime Juice", amount: "1 oz", qty: 1, unit: "oz" },
        { name: "Simple Syrup", amount: "1 oz", qty: 1, unit: "oz" },
        { name: "Soda Water", amount: "top", qty: null, unit: null },
      ],
    });
    expect(isBalanceEligible(mocktail)).toBe(false);
  });
  it("is false for an oversized punch (>6 ingredients)", () => {
    const big = cocktail({
      ingredients: Array.from({ length: 8 }, (_, i) => ({
        name: i === 0 ? "Gin" : `Thing ${i}`, amount: "1 oz", qty: 1, unit: "oz",
      })),
    });
    expect(isBalanceEligible(big)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/cocktailiq/adapter.test.ts`
Expected: FAIL — cannot find module `./adapter`.

- [ ] **Step 3: Implement the adapter**

```typescript
// src/lib/cocktailiq/adapter.ts
import type { Cocktail } from "../cocktails";
import type { BuildIngredient } from "./types";
import { resolveCanonical, getCategoryInfo, getCompounds, mapToBalanceGroup } from "./resolver";

/** ml per 1 unit — mirrors the scaler's conversion table. */
const TO_ML: Record<string, number> = { oz: 29.5735, ml: 1, cl: 10, tsp: 5, tbsp: 15, dash: 0.6 };

function toMl(qty: number | null, unit: string | null): number {
  if (qty == null || unit == null) return 0;
  const factor = TO_ML[unit];
  return factor ? qty * factor : 0;
}

/** Convert a barchive Cocktail's ingredients to scorer input. */
export function cocktailToBuild(cocktail: Cocktail): BuildIngredient[] {
  return cocktail.ingredients.map((ing) => {
    const canonical = resolveCanonical(ing.name);
    const info = canonical ? getCategoryInfo(canonical) : null;
    return {
      name: canonical ?? ing.name.toLowerCase(),
      balanceGroup: mapToBalanceGroup(info),
      volumeMl: toMl(ing.qty, ing.unit),
      compounds: canonical ? getCompounds(canonical) : [],
    };
  });
}

/**
 * Gate: only show the meter for recipes it can judge fairly —
 * 2–6 ingredients, a resolvable base spirit, and at least half the
 * ingredients resolving to a known canonical.
 */
export function isBalanceEligible(cocktail: Cocktail): boolean {
  const n = cocktail.ingredients.length;
  if (n < 2 || n > 6) return false;

  const build = cocktailToBuild(cocktail);
  if (!build.some((b) => b.balanceGroup === "base_spirit")) return false;

  const resolved = cocktail.ingredients.filter((ing) => resolveCanonical(ing.name)).length;
  return resolved >= Math.ceil(n / 2);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/cocktailiq/adapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cocktailiq/adapter.ts src/lib/cocktailiq/adapter.test.ts
git commit -m "feat(cocktailiq): add cocktail->build adapter and eligibility gate"
```

---

### Task 5: Substitutes merge (curated + model)

**Files:**
- Create: `src/lib/cocktailiq/substitutes.ts`
- Test: `src/lib/cocktailiq/substitutes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/cocktailiq/substitutes.test.ts
import { describe, it, expect } from "vitest";
import { getSubstitutesFor } from "./substitutes";

describe("getSubstitutesFor", () => {
  it("returns curated entries when present (override)", () => {
    const subs = getSubstitutesFor("Cointreau");
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.some((s) => s.name === "Triple Sec")).toBe(true);
  });
  it("falls back to the model for a non-curated ingredient", () => {
    const subs = getSubstitutesFor("Gin");
    expect(subs.length).toBeGreaterThan(0);
    // model names are title-cased for display
    expect(subs[0].name[0]).toBe(subs[0].name[0].toUpperCase());
  });
  it("returns empty for an unknown ingredient", () => {
    expect(getSubstitutesFor("Unicorn Tears")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/cocktailiq/substitutes.test.ts`
Expected: FAIL — cannot find module `./substitutes`.

- [ ] **Step 3: Implement the merge**

```typescript
// src/lib/cocktailiq/substitutes.ts
import { SUBSTITUTIONS, type SubstituteEntry } from "../substitutions";
import { resolveCanonical, getSubstituteScores } from "./resolver";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parityForScore(score: number): SubstituteEntry["parity"] {
  if (score >= 4) return "close";
  if (score >= 3) return "close";
  return "different";
}

/** Look up a curated entry (exact, then case-insensitive). */
function curatedFor(name: string): SubstituteEntry[] | undefined {
  if (SUBSTITUTIONS[name]) return SUBSTITUTIONS[name];
  const key = Object.keys(SUBSTITUTIONS).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? SUBSTITUTIONS[key] : undefined;
}

/**
 * Substitutes for an ingredient: hand-curated entries win; otherwise fall back
 * to CocktailIQ's substitution model. Returns [] when nothing is known.
 */
export function getSubstitutesFor(ingredientName: string, topK = 4): SubstituteEntry[] {
  const curated = curatedFor(ingredientName);
  if (curated && curated.length) return curated;

  const canonical = resolveCanonical(ingredientName);
  if (!canonical) return [];

  return getSubstituteScores(canonical)
    .filter(([name]) => name.toLowerCase() !== canonical.toLowerCase())
    .slice(0, topK)
    .map(([name, score]) => ({
      name: titleCase(name),
      note: "Suggested by CocktailIQ flavor model",
      parity: parityForScore(score),
    }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/cocktailiq/substitutes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cocktailiq/substitutes.ts src/lib/cocktailiq/substitutes.test.ts
git commit -m "feat(cocktailiq): merge curated + model substitutions"
```

---

### Task 6: BalanceMeter component (server, CSS)

**Files:**
- Create: `src/components/BalanceMeter.tsx`
- Create: `src/components/BalanceMeter.module.css`

- [ ] **Step 1: Write the component**

```tsx
// src/components/BalanceMeter.tsx
import type { BalanceScores } from "@/lib/cocktailiq/types";
import styles from "./BalanceMeter.module.css";

const DIMENSIONS = [
  ["Diversity", "diversity"],
  ["Proportions", "proportions"],
  ["Chemistry", "chemistry"],
  ["Harmony", "harmony"],
] as const;

/** Presentational 4-dimension balance meter. Server component. */
export function BalanceMeter({ scores }: { scores: BalanceScores }) {
  return (
    <div className={styles.meter}>
      <div className={styles.overall}>
        <span className={styles.overallNum}>{Math.round(scores.overall)}</span>
        <span className={styles.rating}>{scores.rating}</span>
      </div>

      <ul className={styles.bars} role="list">
        {DIMENSIONS.map(([label, key]) => {
          const value = Math.round(scores[key]);
          return (
            <li key={key} className={styles.bar}>
              <span className={styles.barLabel}>{label}</span>
              <span className={styles.track}>
                <span className={styles.fill} style={{ width: `${value}%` }} />
              </span>
              <span className={styles.barVal}>{value}</span>
            </li>
          );
        })}
      </ul>

      {scores.suggestions.length > 0 && (
        <ul className={styles.suggestions}>
          {scores.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

```css
/* src/components/BalanceMeter.module.css */
.meter {
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 16px);
  padding: var(--space-md, 16px);
  background: var(--color-surface, #1a1916);
  border: 1px solid var(--color-border, #2e2c29);
  border-radius: var(--radius-lg, 12px);
}

.overall {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm, 8px);
}

.overallNum {
  font-family: var(--font-display, Georgia, serif);
  font-size: 2.5rem;
  line-height: 1;
  color: var(--color-accent, #c89b5c);
}

.rating {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-secondary, #9e9a93);
}

.bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 8px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bar {
  display: grid;
  grid-template-columns: 6.5rem 1fr 2rem;
  align-items: center;
  gap: var(--space-sm, 8px);
}

.barLabel {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #9e9a93);
}

.track {
  height: 8px;
  border-radius: 9999px;
  background: var(--color-border, #2e2c29);
  overflow: hidden;
}

.fill {
  display: block;
  height: 100%;
  border-radius: 9999px;
  background: var(--color-accent, #c89b5c);
  transition: width 0.3s ease;
}

.barVal {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  text-align: right;
  color: var(--color-text-primary, #f5f0e8);
}

.suggestions {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: var(--color-text-secondary, #9e9a93);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/BalanceMeter.tsx src/components/BalanceMeter.module.css
git commit -m "feat(cocktailiq): add BalanceMeter component"
```

---

### Task 7: FlavorSciencePanel toggle (client)

**Files:**
- Create: `src/components/FlavorSciencePanel.tsx`
- Create: `src/components/FlavorSciencePanel.module.css`
- Test: `src/components/FlavorSciencePanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/FlavorSciencePanel.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlavorSciencePanel } from "./FlavorSciencePanel";

describe("FlavorSciencePanel", () => {
  it("starts collapsed and toggles open", () => {
    render(
      <FlavorSciencePanel rating="Good" overall={72}>
        <p>meter body</p>
      </FlavorSciencePanel>
    );
    const btn = screen.getByRole("button", { name: /flavor science/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/FlavorSciencePanel.test.tsx`
Expected: FAIL — cannot find module `./FlavorSciencePanel`.

- [ ] **Step 3: Implement the toggle**

```tsx
// src/components/FlavorSciencePanel.tsx
"use client";

import { useState, useId } from "react";
import styles from "./FlavorSciencePanel.module.css";

interface Props {
  rating: string;
  overall: number;
  children: React.ReactNode;
}

/** Opt-in disclosure that reveals the build-time-rendered balance meter. */
export function FlavorSciencePanel({ rating, overall, children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <section className={styles.root} aria-labelledby={`${id}-btn`}>
      <button
        id={`${id}-btn`}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.label}>Flavor Science</span>
        <span className={styles.badge}>
          {rating} · {Math.round(overall)}
        </span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={id} className={styles.body} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write the styles**

```css
/* src/components/FlavorSciencePanel.module.css */
.root {
  margin-top: var(--space-lg, 24px);
}

.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 8px);
  width: 100%;
  min-height: var(--touch-target, 44px);
  padding: 0 var(--space-md, 16px);
  background: var(--color-surface, #1a1916);
  border: 1px solid var(--color-border, #2e2c29);
  border-radius: var(--radius-md, 8px);
  color: var(--color-text-primary, #f5f0e8);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}

.toggle:hover {
  border-color: var(--color-accent, #c89b5c);
}

.label {
  flex: 1;
  text-align: left;
}

.badge {
  font-size: 0.8rem;
  color: var(--color-accent, #c89b5c);
}

.chevron {
  transition: transform 0.2s ease;
}

.chevronOpen {
  transform: rotate(180deg);
}

.body {
  margin-top: var(--space-sm, 8px);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/FlavorSciencePanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/FlavorSciencePanel.tsx src/components/FlavorSciencePanel.module.css src/components/FlavorSciencePanel.test.tsx
git commit -m "feat(cocktailiq): add FlavorSciencePanel toggle"
```

---

### Task 8: Wire into the cocktail detail page

Thread build-time-computed substitutes through `RecipeScaler` → `IngredientSubstitutes`, and render the gated balance panel.

**Files:**
- Modify: `src/components/IngredientSubstitutes.tsx`
- Modify: `src/components/RecipeScaler.tsx`
- Modify: `src/app/cocktails/[slug]/page.tsx`

- [ ] **Step 1: Make `IngredientSubstitutes` accept substitutes via prop**

Replace the top of `src/components/IngredientSubstitutes.tsx` (the `Props` interface and the lookup) with:

```tsx
import { SUBSTITUTIONS } from "@/lib/substitutions";
import type { SubstituteEntry } from "@/lib/substitutions";
import styles from "./IngredientSubstitutes.module.css";

interface Props {
  ingredientName: string;
  /** Precomputed substitutes (build-time). Falls back to the curated map if omitted. */
  substitutes?: SubstituteEntry[];
}

export default function IngredientSubstitutes({ ingredientName, substitutes }: Props) {
  const resolved: SubstituteEntry[] | undefined =
    substitutes ??
    SUBSTITUTIONS[ingredientName] ??
    SUBSTITUTIONS[
      Object.keys(SUBSTITUTIONS).find(
        (k) => k.toLowerCase() === ingredientName.toLowerCase()
      ) ?? ""
    ];

  if (!resolved || resolved.length === 0) return null;
```

Then in the same file, rename the variable used in the render from `substitutes` to `resolved` (the `.map`). Find:

```tsx
      <ul className={styles.list} role="list">
        {substitutes.map((sub) => (
```
and change `substitutes.map` to `resolved.map`.

- [ ] **Step 2: Pass substitutes through `RecipeScaler`**

In `src/components/RecipeScaler.tsx`, extend the `Props` interface and thread the prop:

```tsx
import type { SubstituteEntry } from "@/lib/substitutions";

interface Props {
  ingredients: Ingredient[];
  /** Build-time substitutes keyed by ingredient name. */
  substitutesByIngredient?: Record<string, SubstituteEntry[]>;
}
```

Update the function signature:

```tsx
export default function RecipeScaler({ ingredients, substitutesByIngredient }: Props) {
```

Update the `IngredientSubstitutes` usage (inside the ingredient `.map`):

```tsx
              <IngredientSubstitutes
                ingredientName={ing.name}
                substitutes={substitutesByIngredient?.[ing.name]}
              />
```

- [ ] **Step 3: Compute and render in the detail page**

In `src/app/cocktails/[slug]/page.tsx`, add imports near the top (after existing imports):

```tsx
import { BalanceMeter } from "@/components/BalanceMeter";
import { FlavorSciencePanel } from "@/components/FlavorSciencePanel";
import { cocktailToBuild, isBalanceEligible } from "@/lib/cocktailiq/adapter";
import { calculateBalance } from "@/lib/cocktailiq/balance";
import { getSubstitutesFor } from "@/lib/cocktailiq/substitutes";
import type { SubstituteEntry } from "@/lib/substitutions";
```

In `CocktailDetailPage`, after `if (!cocktail) notFound();`, compute (build-time):

```tsx
  const substitutesByIngredient: Record<string, SubstituteEntry[]> = {};
  for (const ing of cocktail.ingredients) {
    const subs = getSubstitutesFor(ing.name);
    if (subs.length) substitutesByIngredient[ing.name] = subs;
  }

  const balanceScores = isBalanceEligible(cocktail)
    ? calculateBalance(cocktailToBuild(cocktail))
    : null;
```

Pass the substitutes to the scaler — find `<RecipeScaler ingredients={cocktail.ingredients} />` and replace with:

```tsx
              <RecipeScaler
                ingredients={cocktail.ingredients}
                substitutesByIngredient={substitutesByIngredient}
              />
```

Render the panel — immediately after the closing `</div>` of the `styles.recipe` block (the two-column ingredients+method section), before `</div>` of `styles.details`, add:

```tsx
          {balanceScores && (
            <FlavorSciencePanel
              rating={balanceScores.rating}
              overall={balanceScores.overall}
            >
              <BalanceMeter scores={balanceScores} />
            </FlavorSciencePanel>
          )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full unit suite**

Run: `npm run test`
Expected: all tests pass (existing 136 + the new resolver/balance/adapter/substitutes/panel tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/IngredientSubstitutes.tsx src/components/RecipeScaler.tsx "src/app/cocktails/[slug]/page.tsx"
git commit -m "feat(cocktailiq): wire balance meter + substitutions into recipe page"
```

---

### Task 9: Build, verify bundle, and screenshot

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: exit 0; 3,468 cocktail + ~900 ingredient pages generated.

- [ ] **Step 2: Confirm CocktailIQ data is NOT in the client bundle**

Run:
```bash
grep -rl "substitution_scores\|flavordb" .next/static 2>/dev/null | head; echo "exit grep: $?"
```
Expected: no matches (the data stays server/build-side). If any chunk references the raw data, the lookup leaked into a client component — move the computation back into the server page.

- [ ] **Step 3: Manual preview check (dev server)**

Run: `npm run dev` (background), then open `http://localhost:3000/cocktails/margarita`.
Expected: a "Flavor Science" toggle below the recipe; clicking it reveals the meter with four bars and a rating. Ingredient rows show substitute disclosures for far more ingredients than before.

- [ ] **Step 4: Spot-check the gate**

Open a non-eligible recipe (e.g. a single-ingredient shot or a punch with >6 ingredients).
Expected: NO Flavor Science toggle appears.

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore(cocktailiq): verification tweaks"
```

---

## Notes for the implementer

- **Do not** import anything from `src/lib/cocktailiq/resolver.ts`, `adapter.ts`, `balance.ts`, or `substitutes.ts` into a `"use client"` component — that would pull the data JSON into the client bundle. All four are used only from the server page (`page.tsx`). `BalanceMeter` is a server component; `FlavorSciencePanel` is the only client piece and receives plain data.
- The scaler's ml conversion table (`TO_ML`) is duplicated in `adapter.ts` intentionally (it's a tiny constant and avoids a cross-module dependency on the client-side scaler). If `src/lib/scaler.ts` later exports `TO_ML`, switch to importing it.
- Model substitution quality is imperfect (e.g. gin's top model sub is "ginger ale"); curated entries take precedence, which is why they stay.
