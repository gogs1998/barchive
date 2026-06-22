import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CocktailsClient } from "./CocktailsClient";
import { getCocktails, getCategories, getGlasses } from "@/lib/api";

export const metadata = {
  title: "Cocktails — BarIQ",
  description: "Browse classic cocktail recipes filtered by spirit and glass.",
};

export default async function CocktailsPage() {
  // Fetch all data at build time; CocktailsClient reads ?category= and ?q=
  // from the URL client-side (useSearchParams). Dataset is small (~79 cocktails)
  // so full prefetch is fine.
  const [{ cocktails }, categories, glasses] = await Promise.all([
    getCocktails({ pageSize: 100000 }),
    getCategories(),
    getGlasses(),
  ]);

  // The browse grid only needs card-level fields; drop the (large) step lists
  // to keep the client payload small now that the library is thousands of drinks.
  const lightCocktails = cocktails.map((c) => ({ ...c, steps: [] as string[] }));

  return (
    <PageShell active="cocktails">
      <Suspense fallback={null}>
        <CocktailsClient
          initialCocktails={lightCocktails}
          categories={categories}
          glasses={glasses}
        />
      </Suspense>
    </PageShell>
  );
}
