import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CocktailsClient } from "./CocktailsClient";
import { getCocktails, getCategories, getGlasses } from "@/lib/api";

export const metadata = {
  title: "Cocktails — BarIQ",
  description: "Browse classic cocktail recipes filtered by spirit and glass.",
};

// searchParams is a Promise in Next.js 15 App Router
interface CocktailsPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function CocktailsPage({ searchParams }: CocktailsPageProps) {
  // Await searchParams so the page is correctly parameterised server-side.
  // We still fetch all cocktails so client-side filter switching works without
  // a network round-trip (dataset is small: ~79 cocktails).
  await searchParams;

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
