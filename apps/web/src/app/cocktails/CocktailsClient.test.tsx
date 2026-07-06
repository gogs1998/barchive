import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import type { ReactNode } from "react";

// ── Mutable mocks ────────────────────────────────────────────────────────────
let searchString = "make=1";
let authState: { barIngredientData: { id: string; name: string; category: string }[]; barHydrated: boolean } = {
  barIngredientData: [],
  barHydrated: false,
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchString),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/cocktails",
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/components/SearchBar", () => ({
  SearchBar: () => <div data-testid="search" />,
}));
vi.mock("@/components/CocktailCard", () => ({
  CocktailCard: ({ cocktail }: { cocktail: { name: string } }) => (
    <div data-testid="card">{cocktail.name}</div>
  ),
}));

import { CocktailsClient } from "./CocktailsClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mk = (name: string, ingredients: string[]): any => ({
  id: name,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  category: "Gin",
  glass: "Coupe",
  img: "",
  color: "#fff",
  tags: [],
  abv: "20%",
  time: "2 min",
  ingredients: ingredients.map((n) => ({ name: n, amount: "1 oz", qty: 1, unit: "oz" })),
  steps: [],
});

const COCKTAILS = [
  mk("Gin Fizz", ["Gin", "Lemon Juice"]),
  mk("Margarita", ["Tequila", "Lime Juice"]),
];

function Node(children: ReactNode) {
  return children;
}

describe("CocktailsClient ?make=1 deep-link (P0-3)", () => {
  afterEach(() => {
    cleanup();
    searchString = "make=1";
    authState = { barIngredientData: [], barHydrated: false };
  });

  it("keeps the make-filter ON when the bar populates after a hard load", () => {
    // Hard load: ?make=1 present, but bar not yet hydrated (empty).
    searchString = "make=1";
    authState = { barIngredientData: [], barHydrated: false };
    const { rerender } = render(
      Node(<CocktailsClient initialCocktails={COCKTAILS} categories={["Gin"]} glasses={["Coupe"]} />)
    );

    // Bar hydrates with ingredients that make exactly the Gin Fizz.
    authState = {
      barIngredientData: [
        { id: "gin", name: "Gin", category: "Spirit" },
        { id: "lemon", name: "Lemon Juice", category: "Juice" },
      ],
      barHydrated: true,
    };
    rerender(
      Node(<CocktailsClient initialCocktails={COCKTAILS} categories={["Gin"]} glasses={["Coupe"]} />)
    );

    // The filter must still be active: only the makeable cocktail renders.
    const btn = screen.getByRole("button", { name: /what can i make/i });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    const cards = screen.getAllByTestId("card");
    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toBe("Gin Fizz");
  });

  it("forces the make-filter OFF only once the bar has hydrated genuinely empty", () => {
    searchString = "make=1";
    authState = { barIngredientData: [], barHydrated: true };
    render(
      Node(<CocktailsClient initialCocktails={COCKTAILS} categories={["Gin"]} glasses={["Coupe"]} />)
    );
    // Empty hydrated bar: filter forced off, so all cocktails show.
    expect(screen.getAllByTestId("card")).toHaveLength(COCKTAILS.length);
  });
});
