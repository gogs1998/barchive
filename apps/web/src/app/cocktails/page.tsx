import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CocktailsClient } from "./CocktailsClient";
import { getCocktails, getCategories, getGlasses } from "@/lib/api";

export const metadata = {
  title: "Cocktails — BarIQ",
  description: "Browse 80+ classic cocktail recipes filtered by spirit and glass.",
};

export default async function CocktailsPage() {
  const [{ cocktails }, categories, glasses] = await Promise.all([
    getCocktails({ pageSize: 100 }),
    getCategories(),
    getGlasses(),
  ]);

  return (
    <PageShell active="cocktails">
      <CocktailsClient
        initialCocktails={cocktails}
        categories={categories}
        glasses={glasses}
      />
    </PageShell>
  );
}
