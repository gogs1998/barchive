import { render, screen, within, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
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
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("link", { name: /cocktails/i })).toHaveAttribute("aria-current", "page");
  });

  it("main has id=main-content", () => {
    render(<PageShell><span /></PageShell>);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
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
});
