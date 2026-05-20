import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CocktailsClient } from "./CocktailsClient";
import { getCocktails, getCategories, getGlasses } from "@/lib/api";

export const metadata = {
  title: "Cocktails — BarIQ",
  description: "Browse classic cocktail recipes filtered by spirit and glass.",
};

export default async function CocktailsPage() {
  // Fetch all cocktails so client-side filter switching works without a
  // network round-trip (dataset is small: ~79 cocktails).
  // The ?category= URL param is read client-side by CocktailsClient via
  // useSearchParams(), which handles deep-links and chip clicks correctly.
  const [{ cocktails }, categories, glasses] = await Promise.all([
    getCocktails({ pageSize: 500 }),
    getCategories(),
    getGlasses(),
  ]);

  return (
    <PageShell active="cocktails">
      <Suspense fallback={null}>
        <CocktailsClient
          initialCocktails={cocktails}
          categories={categories}
          glasses={glasses}
        />
      </Suspense>
    </PageShell>
  );
}
