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
