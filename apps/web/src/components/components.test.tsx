import { render, screen, within, fireEvent, act, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CategoryGrid } from "@/components/CategoryGrid";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { HeaderSearch } from "@/components/HeaderSearch";
import { IngredientBadge } from "@/components/IngredientBadge";
import { CocktailCard } from "@/components/CocktailCard";
import { PageShell } from "@/components/PageShell";
import { BuildView } from "@/components/BuildView";
import { FavouriteButton } from "@/components/FavouriteButton";
import RecipeScaler from "@/components/RecipeScaler";
import IngredientSubstitutes from "@/components/IngredientSubstitutes";
import type { Cocktail, Ingredient } from "@/lib/cocktails";
import type { ReactNode } from "react";

// ─── Mock auth-context so components under test don't need a real provider ───
vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    loading: false,
    modalOpen: false,
    modalView: "login",
    openAuthModal: vi.fn(),
    closeAuthModal: vi.fn(),
    setModalView: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    sendVerificationEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    pendingEmail: "",
    setPendingEmail: vi.fn(),
    barIngredients: [],
    barIngredientData: [],
    barLoading: false,
    addBarIngredient: vi.fn(),
    removeBarIngredient: vi.fn(),
    favourites: [],
    toggleFavourite: vi.fn(),
  }),
}));

// ─── Mock next/link and next/image ────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
  ),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Test data ────────────────────────────────────────────────────────────────
const mockCocktail: Cocktail = {
  id: "test-1",
  name: "Test Sour",
  category: "Whiskey",
  glass: "Rocks",
  img: "https://example.com/img.jpg",
  color: "#D4A56A",
  ingredients: [
    { name: "Bourbon", amount: "2 oz", qty: 2, unit: "oz" },
    { name: "Lemon Juice", amount: "0.75 oz", qty: 0.75, unit: "oz" },
    { name: "Simple Syrup", amount: "0.75 oz", qty: 0.75, unit: "oz" },
    { name: "Egg White", amount: "1", qty: null, unit: null },
  ],
  steps: ["Dry shake.", "Add ice.", "Shake hard.", "Strain."],
  tags: ["classic", "citrus"],
  abv: "20%",
  time: "3 min",
  vegan: false,
  glutenFree: true,
  lowAbv: false,
  slug: "test-sour",
};

// ─── CategoryGrid ─────────────────────────────────────────────────────────────
const ALL_CATEGORIES = [
  "Amaretto", "Aperitivo", "Brandy", "Cachaça", "Champagne",
  "Gin", "Liqueur", "Mezcal", "Pisco", "Rum", "Tequila", "Vodka", "Whiskey",
];

describe("CategoryGrid", () => {
  it("renders hero-tier spirits (Gin, Rum, Tequila, Vodka, Whiskey)", () => {
    render(<CategoryGrid categories={ALL_CATEGORIES} />);
    for (const spirit of ["Gin", "Rum", "Tequila", "Vodka", "Whiskey"]) {
      expect(screen.getByText(spirit)).toBeInTheDocument();
    }
  });

  it("secondary spirits are hidden by default (inert)", () => {
    render(<CategoryGrid categories={ALL_CATEGORIES} />);
    const overflowWrap = document.querySelector('[inert]') as HTMLElement;
    expect(overflowWrap).toBeInTheDocument();
    // Amaretto is secondary — it exists in DOM but container is inert
    expect(screen.getByText("Amaretto").closest('[inert]')).toBeTruthy();
  });

  it("toggle button shows 'Show all spirits' by default", () => {
    render(<CategoryGrid categories={ALL_CATEGORIES} />);
    const btn = screen.getByRole("button", { name: /show all spirits/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("toggle expands secondary spirits", () => {
    render(<CategoryGrid categories={ALL_CATEGORIES} />);
    const btn = screen.getByRole("button", { name: /show all spirits/i });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /show fewer spirits/i })).toBeInTheDocument();
    // overflow wrapper should not be inert after expand
    const overflowWrap = document.querySelector('div[inert]') as HTMLElement;
    expect(overflowWrap).toBeNull();
  });

  it("each category card links to correct cocktails page filter", () => {
    render(<CategoryGrid categories={["Gin", "Rum"]} />);
    const ginLink = screen.getByRole("link", { name: /gin/i });
    expect(ginLink).toHaveAttribute("href", "/cocktails?category=Gin");
  });

  it("cards have min-height via CSS class (heroCard for hero spirits)", () => {
    render(<CategoryGrid categories={["Gin", "Amaretto"]} />);
    const ginLink = screen.getByRole("link", { name: /gin/i });
    // heroCard class should be present on hero spirits
    expect(ginLink.className).toMatch(/heroCard/);
  });

  it("no role=listitem on anchor elements (a11y fix)", () => {
    render(<CategoryGrid categories={ALL_CATEGORIES} />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link).not.toHaveAttribute("role", "listitem");
    }
  });
});

// ─── Header ───────────────────────────────────────────────────────────────────
describe("Header", () => {
  it("renders the BarIQ wordmark", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("BarIQ")).toBeInTheDocument();
  });

  it("renders primary navigation links", () => {
    render(<Header />);
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /cocktails/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /ingredients/i })).toBeInTheDocument();
  });

  it("marks active nav item with aria-current", () => {
    render(<Header active="cocktails" />);
    const nav = screen.getByRole("navigation");
    const link = within(nav).getByRole("link", { name: /cocktails/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("does not mark inactive links with aria-current", () => {
    render(<Header active="cocktails" />);
    const nav = screen.getByRole("navigation");
    const homeLink = within(nav).getByRole("link", { name: /home/i });
    expect(homeLink).not.toHaveAttribute("aria-current");
  });
});

// ─── Footer ───────────────────────────────────────────────────────────────────
describe("Footer", () => {
  it("renders a footer with contentinfo role", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("shows the BarIQ wordmark", () => {
    render(<Footer />);
    expect(screen.getByText("BarIQ")).toBeInTheDocument();
  });
});

// ─── SearchBar ────────────────────────────────────────────────────────────────
describe("SearchBar", () => {
  it("renders a search input", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(
      screen.getByRole("searchbox", { name: /search cocktails/i })
    ).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "margarita" } });
    expect(onChange).toHaveBeenCalledWith("margarita");
  });

  it("shows clear button when value is non-empty", () => {
    render(<SearchBar value="gin" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /clear search/i })).toBeInTheDocument();
  });

  it("hides clear button when value is empty", () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(
      screen.queryByRole("button", { name: /clear search/i })
    ).not.toBeInTheDocument();
  });

  it("calls onChange with empty string when clear is clicked", () => {
    const onChange = vi.fn();
    render(<SearchBar value="gin" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("accepts custom placeholder", () => {
    render(<SearchBar value="" onChange={() => {}} placeholder="Find a drink…" />);
    expect(
      screen.getByPlaceholderText("Find a drink…")
    ).toBeInTheDocument();
  });
});

// ─── IngredientBadge ──────────────────────────────────────────────────────────
describe("IngredientBadge", () => {
  it("renders the ingredient name", () => {
    render(<IngredientBadge name="Bourbon" />);
    expect(screen.getByText("Bourbon")).toBeInTheDocument();
  });

  it("renders the amount when provided", () => {
    render(<IngredientBadge name="Bourbon" amount="2 oz" />);
    expect(screen.getByText("2 oz")).toBeInTheDocument();
    expect(screen.getByText("Bourbon")).toBeInTheDocument();
  });

  it("renders without amount", () => {
    render(<IngredientBadge name="Salt" />);
    expect(screen.getByText("Salt")).toBeInTheDocument();
    expect(screen.queryByText("oz")).not.toBeInTheDocument();
  });
});

// ─── CocktailCard ─────────────────────────────────────────────────────────────
describe("CocktailCard", () => {
  it("renders the cocktail name", () => {
    render(<CocktailCard cocktail={mockCocktail} />);
    expect(screen.getByText("Test Sour")).toBeInTheDocument();
  });

  it("links to the cocktail detail page", () => {
    render(<CocktailCard cocktail={mockCocktail} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/cocktails/test-sour");
  });

  it("shows the category pill", () => {
    render(<CocktailCard cocktail={mockCocktail} />);
    expect(screen.getByText("Whiskey")).toBeInTheDocument();
  });

  it("shows glass and time meta", () => {
    render(<CocktailCard cocktail={mockCocktail} />);
    expect(screen.getByText("Rocks")).toBeInTheDocument();
    expect(screen.getByText("3 min")).toBeInTheDocument();
  });

  it("shows top 3 ingredients when showIngredients is true", () => {
    render(<CocktailCard cocktail={mockCocktail} showIngredients />);
    expect(screen.getByText("Bourbon")).toBeInTheDocument();
    expect(screen.getByText("Lemon Juice")).toBeInTheDocument();
    expect(screen.getByText("Simple Syrup")).toBeInTheDocument();
  });

  it("shows +N more when ingredients exceed 3", () => {
    render(<CocktailCard cocktail={mockCocktail} showIngredients />);
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("does not show ingredients when showIngredients is false (default)", () => {
    render(<CocktailCard cocktail={mockCocktail} />);
    expect(screen.queryByText("Bourbon")).not.toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<CocktailCard cocktail={mockCocktail} />);
    expect(
      screen.getByRole("link", { name: /Test Sour — Whiskey/i })
    ).toBeInTheDocument();
  });
  it("does not show makeable badge by default", () => {
    render(<CocktailCard cocktail={mockCocktail} />);
    expect(screen.queryByText(/can make/i)).not.toBeInTheDocument();
  });

  it("shows makeable badge when makeable=true", () => {
    render(<CocktailCard cocktail={mockCocktail} makeable />);
    expect(screen.getByText(/can make/i)).toBeInTheDocument();
  });
});

// ─── PageShell ────────────────────────────────────────────────────────────────
describe("PageShell", () => {
  it("renders header, main, and footer", () => {
    render(<PageShell>Hello</PageShell>);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("passes active prop to Header", () => {
    render(<PageShell active="cocktails"><span /></PageShell>);
    // There may be multiple nav elements (desktop + mobile); check at least one has the active link
    const navs = screen.getAllByRole("navigation");
    const hasActiveLink = navs.some((nav) => {
      const link = within(nav).queryByRole("link", { name: /cocktails/i });
      return link?.getAttribute("aria-current") === "page";
    });
    expect(hasActiveLink).toBe(true);
  });

  it("main has id=main-content", () => {
    render(<PageShell><span /></PageShell>);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});

// ─── HeaderSearch ────────────────────────────────────────────────────────────
describe("HeaderSearch", () => {
  it("renders a search input with aria-label 'Search cocktails'", () => {
    render(<HeaderSearch />);
    expect(
      screen.getByRole("combobox", { name: /search cocktails/i })
    ).toBeInTheDocument();
  });

  it("shows results when query matches a cocktail name", async () => {
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Negroni" } });
    await waitFor(() =>
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    );
    expect(screen.getByText("Negroni")).toBeInTheDocument();
  });

  it("shows results when query matches an ingredient", async () => {
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Campari" } });
    await waitFor(() =>
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    );
    // Multiple cocktails use Campari — at least one should appear
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("result rows show category pill", async () => {
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Negroni" } });
    await waitFor(() =>
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    );
    // Category pill present (multiple Negroni variants may match — at least one Gin pill)
    expect(screen.getAllByText("Gin").length).toBeGreaterThan(0);
  });

  it("shows empty state prompt when query has no matches", async () => {
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "zzznomatch999" } });
    await waitFor(() =>
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    );
    expect(screen.getByText(/Try/i)).toBeInTheDocument();
  });

  it("closes results and clears query on Escape", async () => {
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Daiquiri" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("navigates to cocktail on Enter when option is highlighted", async () => {
    mockPush.mockClear();
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Daiquiri" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\/cocktails\//));
  });

  it("navigates to /cocktails?q= on Enter with no highlighted option", async () => {
    mockPush.mockClear();
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "mojito" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    // Press Enter without arrowing down (activeIndex = -1)
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/cocktails?q=mojito");
  });

  it("navigates to /cocktails?q= on Enter even when dropdown is not open", async () => {
    mockPush.mockClear();
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    // Type a query that yields no results so dropdown closes
    fireEvent.change(input, { target: { value: "xyzzy" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/cocktails?q=xyzzy");
  });

  it("does not navigate on Enter when query is empty", () => {
    mockPush.mockClear();
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("has role=listbox with aria-live=polite on results", async () => {
    render(<HeaderSearch />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Margarita" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-live", "polite");
  });

  it("input has aria-label='Search cocktails'", () => {
    render(<HeaderSearch />);
    expect(screen.getByLabelText(/search cocktails/i)).toBeInTheDocument();
  });

  it("renders mobile toggle button with correct aria-label", () => {
    render(<HeaderSearch />);
    expect(
      screen.getByRole("button", { name: /open search/i })
    ).toBeInTheDocument();
  });
});

// ─── Header includes search ───────────────────────────────────────────────────
describe("Header — with search", () => {
  it("includes the HeaderSearch component", () => {
    render(<Header />);
    expect(screen.getByTestId("header-search")).toBeInTheDocument();
  });
});

// ─── BuildView — enter animation ──────────────────────────────────────────────
const darkTheme = {
  bg: "#0E0D0B",
  surface: "#17140F",
  border: "rgba(245,238,224,0.09)",
  text: "#F5EEE0",
  muted: "#8B867E",
  accent: "#C89B5C",
  display: '"Instrument Serif", Georgia, serif',
  ui: '"Geist", system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace',
};

describe("BuildView", () => {
  it("applies the enter animation class to the root container", () => {
    const { container } = render(
      <BuildView
        cocktail={mockCocktail}
        theme={darkTheme as never}
        multiplier={1}
        setMultiplier={vi.fn()}
        onClose={vi.fn()}
        eightySix={[]}
      />
    );
    // The outermost element should carry the CSS-module enter class
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("enter");
  });

  it("Exit button has aria-label='Exit Bar Mode'", () => {
    render(
      <BuildView
        cocktail={mockCocktail}
        theme={darkTheme as never}
        multiplier={1}
        setMultiplier={vi.fn()}
        onClose={vi.fn()}
        eightySix={[]}
      />
    );
    expect(screen.getByRole("button", { name: "Exit Bar Mode" })).toBeInTheDocument();
  });

  it("Previous button has aria-label='Previous step'", () => {
    render(
      <BuildView
        cocktail={mockCocktail}
        theme={darkTheme as never}
        multiplier={1}
        setMultiplier={vi.fn()}
        onClose={vi.fn()}
        eightySix={[]}
      />
    );
    expect(screen.getByRole("button", { name: "Previous step" })).toBeInTheDocument();
  });

  it("Next button has aria-label='Next step'", () => {
    render(
      <BuildView
        cocktail={mockCocktail}
        theme={darkTheme as never}
        multiplier={1}
        setMultiplier={vi.fn()}
        onClose={vi.fn()}
        eightySix={[]}
      />
    );
    expect(screen.getByRole("button", { name: "Next step" })).toBeInTheDocument();
  });

  it("active step region has aria-label with step number and description", () => {
    render(
      <BuildView
        cocktail={mockCocktail}
        theme={darkTheme as never}
        multiplier={1}
        setMultiplier={vi.fn()}
        onClose={vi.fn()}
        eightySix={[]}
      />
    );
    expect(
      screen.getByRole("region", { name: /Step 1 of 4: Dry shake\./i })
    ).toBeInTheDocument();
  });

  it("batch multiplier buttons have aria-label and aria-pressed", () => {
    render(
      <BuildView
        cocktail={mockCocktail}
        theme={darkTheme as never}
        multiplier={1}
        setMultiplier={vi.fn()}
        onClose={vi.fn()}
        eightySix={[]}
      />
    );
    const btn = screen.getByRole("button", { name: "Batch ×1" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Batch ×2" })).toHaveAttribute("aria-pressed", "false");
  });
});

// ─── FavouriteButton ─────────────────────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  addUserFavourite: vi.fn().mockResolvedValue(undefined),
  removeUserFavourite: vi.fn().mockResolvedValue(undefined),
  getCocktails: vi.fn().mockResolvedValue({ cocktails: [], total: 0, page: 1, pageSize: 24 }),
}));

describe("FavouriteButton", () => {
  it("renders save label and aria-pressed=false when not in favourites", () => {
    // Global useAuth mock returns favourites: []
    render(<FavouriteButton slug="margarita" recipeName="Margarita" />);
    const btn = screen.getByRole("button", { name: "Save Margarita to favourites" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("is not disabled when idle", () => {
    render(<FavouriteButton slug="margarita" recipeName="Margarita" />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("clicks heart button when unauthenticated without throwing", async () => {
    // Global auth mock has user: null — clicking triggers openAuthModal
    render(<FavouriteButton slug="negroni" recipeName="Negroni" />);
    await act(async () => { fireEvent.click(screen.getByRole("button")); });
    // Button should still be in the document (no crash)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders detail size variant without crashing", () => {
    render(<FavouriteButton slug="spritz" recipeName="Spritz" size="detail" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has type=button to avoid accidental form submit", () => {
    render(<FavouriteButton slug="martini" recipeName="Martini" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

// ─── RecipeScaler ─────────────────────────────────────────────────────────────
describe("RecipeScaler", () => {
  const ingredients: Ingredient[] = [
    { name: "Gin", amount: "1.5 oz", qty: 1.5, unit: "oz" },
    { name: "Vermouth", amount: "0.75 oz", qty: 0.75, unit: "oz" },
    { name: "Ice", amount: "a handful", qty: null, unit: null },
  ];

  it("renders Ingredients heading", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    expect(screen.getByRole("heading", { name: /ingredients/i })).toBeInTheDocument();
  });

  it("renders all ingredient names", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    expect(screen.getByText("Gin")).toBeInTheDocument();
    expect(screen.getByText("Vermouth")).toBeInTheDocument();
    expect(screen.getByText("Ice")).toBeInTheDocument();
  });

  it("renders multiplier preset buttons", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    expect(screen.getByRole("button", { name: "1×" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2×" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4×" })).toBeInTheDocument();
  });

  it("renders unit toggle buttons (oz, ml, cl)", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    expect(screen.getByRole("button", { name: "oz" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ml" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cl" })).toBeInTheDocument();
  });

  it("clicking 2× preset marks it as active", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    const btn2x = screen.getByRole("button", { name: "2×" });
    fireEvent.click(btn2x);
    expect(btn2x).toHaveAttribute("aria-pressed", "true");
  });

  it("switching unit to ml updates aria-pressed on ml button", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    const mlBtn = screen.getByRole("button", { name: "ml" });
    fireEvent.click(mlBtn);
    expect(mlBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("custom multiplier input overrides preset when valid", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    const customInput = screen.getByRole("spinbutton", { name: /custom batch multiplier/i });
    fireEvent.change(customInput, { target: { value: "3" } });
    // 3× is not a preset so no preset should be active
    const btn1x = screen.getByRole("button", { name: "1×" });
    expect(btn1x).toHaveAttribute("aria-pressed", "false");
  });

  it("non-numeric amounts (no qty) render unchanged", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    expect(screen.getByText("a handful")).toBeInTheDocument();
  });

  it("renders correct aria label for ingredient list", () => {
    render(<RecipeScaler ingredients={ingredients} />);
    expect(screen.getByRole("list", { name: /3 ingredients/i })).toBeInTheDocument();
  });
});

// ─── IngredientSubstitutes ────────────────────────────────────────────────────
describe("IngredientSubstitutes", () => {
  it("renders nothing for an ingredient with no substitutes", () => {
    const { container } = render(<IngredientSubstitutes ingredientName="Soda Water" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a disclosure for an ingredient with substitutes (Campari)", () => {
    render(<IngredientSubstitutes ingredientName="Campari" />);
    const details = document.querySelector("details");
    expect(details).toBeInTheDocument();
    expect(screen.getByText(/Substitutes for Campari/i)).toBeInTheDocument();
  });

  it("is collapsed by default", () => {
    render(<IngredientSubstitutes ingredientName="Campari" />);
    const details = document.querySelector("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("expanding reveals substitute entries for Campari", () => {
    render(<IngredientSubstitutes ingredientName="Campari" />);
    const summary = screen.getByText(/Substitutes for/i).closest("summary")!;
    fireEvent.click(summary);
    expect(screen.getByText("Aperol")).toBeInTheDocument();
    expect(screen.getByText("Gran Classico")).toBeInTheDocument();
  });

  it("shows parity badge for each substitute", () => {
    render(<IngredientSubstitutes ingredientName="Campari" />);
    const summary = screen.getByText(/Substitutes for/i).closest("summary")!;
    fireEvent.click(summary);
    // Aperol is 'close', Gran Classico is 'equal'
    const badges = screen.getAllByText(/equal|close|different/);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it("renders substitutes for Sweet Vermouth", () => {
    render(<IngredientSubstitutes ingredientName="Sweet Vermouth" />);
    expect(document.querySelector("details")).toBeInTheDocument();
  });

  it("case-insensitive match — 'campari' matches 'Campari' entry", () => {
    render(<IngredientSubstitutes ingredientName="campari" />);
    expect(document.querySelector("details")).toBeInTheDocument();
  });

  it("RecipeScaler shows substitutes inline after Campari row", () => {
    const ings: Ingredient[] = [
      { name: "Campari", amount: "1 oz", qty: 1, unit: "oz" },
      { name: "Soda Water", amount: "2 oz", qty: 2, unit: "oz" },
    ];
    render(<RecipeScaler ingredients={ings} />);
    // Campari row should have a substitutes disclosure
    expect(screen.getByText(/Substitutes for/i)).toBeInTheDocument();
    // Soda Water row should not (no substitutes)
    const allDetails = document.querySelectorAll("details");
    expect(allDetails).toHaveLength(1);
  });
});

