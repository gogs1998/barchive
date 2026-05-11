import { render, screen, within, fireEvent, act, waitFor } from "@testing-library/react";
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
import type { Cocktail } from "@/lib/cocktails";

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
    { name: "Bourbon", amount: "2 oz" },
    { name: "Lemon Juice", amount: "0.75 oz" },
    { name: "Simple Syrup", amount: "0.75 oz" },
    { name: "Egg White", amount: "1" },
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

  it("secondary spirits are hidden by default (aria-hidden)", () => {
    render(<CategoryGrid categories={ALL_CATEGORIES} />);
    const overflowWrap = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(overflowWrap).toBeInTheDocument();
    // Amaretto is secondary — it exists in DOM but container is aria-hidden
    expect(screen.getByText("Amaretto").closest('[aria-hidden="true"]')).toBeTruthy();
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
    // overflow wrapper aria-hidden should be false (not "true") after expand
    const overflowWrap = document.querySelector('div[aria-hidden]') as HTMLElement;
    expect(overflowWrap?.getAttribute("aria-hidden")).not.toBe("true");
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
    // Category pill present
    expect(screen.getByText("Gin")).toBeInTheDocument();
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
