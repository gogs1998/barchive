import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSetGuestBar = vi.fn();
const mockOpenAuthModal = vi.fn();

// Mutable auth state so individual tests can simulate guest vs signed-in.
const authState: {
  user: unknown;
  barIngredientData: { id: string; name: string; category: string }[];
  barHydrated: boolean;
} = { user: null, barIngredientData: [], barHydrated: true };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
    barIngredientData: authState.barIngredientData,
    barHydrated: authState.barHydrated,
    setGuestBar: mockSetGuestBar,
    openAuthModal: mockOpenAuthModal,
    favourites: [],
    toggleFavourite: vi.fn(),
  }),
}));

import { OnboardingWizard } from "@/components/OnboardingWizard";

const ONBOARDED_KEY = "biq_onboarded";

describe("OnboardingWizard", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSetGuestBar.mockClear();
    mockOpenAuthModal.mockClear();
    authState.user = null;
    authState.barIngredientData = [];
    authState.barHydrated = true;
  });
  afterEach(cleanup);

  it("step 1 shows a Get started button", () => {
    render(<OnboardingWizard />);
    expect(
      screen.getByRole("button", { name: /get started/i })
    ).toBeInTheDocument();
  });

  it("Get started advances to step 2 with the picker", () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    // A known starter ingredient is rendered
    expect(screen.getByRole("button", { name: /^Gin$/i })).toBeInTheDocument();
  });

  it("selecting high-value starters renders a positive makeable count on the payoff", () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    // A combination that maps to many cocktails in the real dataset.
    fireEvent.click(screen.getByRole("button", { name: /^Gin$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Dry Vermouth$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Orange Bitters$/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const heading = screen.getByRole("heading", { name: /cocktails? right now/i });
    expect(heading).toBeInTheDocument();
    // The heading shows the real computed number — assert it's a positive integer.
    const match = heading.textContent?.match(/[\d,]+/);
    expect(match).not.toBeNull();
    const count = Number(match![0].replace(/,/g, ""));
    expect(count).toBeGreaterThan(0);
  });

  it("Browse what I can make saves the guest bar and routes to ?make=1", () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Gin$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Dry Vermouth$/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /browse what i can make/i })
    );

    // Guest bar is set with the mapped items (id + name + category).
    expect(mockSetGuestBar).toHaveBeenCalledTimes(1);
    const items = mockSetGuestBar.mock.calls[0][0];
    expect(items).toEqual([
      // Slug ids: the Worker resolves bar items by ingredients.slug (NEW-1).
      { id: "gin", name: "Gin", category: "Other" },
      { id: "dry-vermouth", name: "Dry Vermouth", category: "Other" },
    ]);
    // Onboarded flag persisted and router pushed to the make deep-link.
    expect(localStorage.getItem(ONBOARDED_KEY)).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith("/cocktails?make=1");
  });

  it("Skip sets the onboarded flag", () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(localStorage.getItem(ONBOARDED_KEY)).toBeTruthy();
  });

  // P1-5: a signed-in user must not have their account bar clobbered.
  it("redirects a signed-in user out and never touches the guest bar (P1-5)", () => {
    authState.user = { id: "u1", email: "a@b.c" };
    render(<OnboardingWizard />);
    // Wizard renders nothing (redirecting), no Get started button.
    expect(screen.queryByRole("button", { name: /get started/i })).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/my-bar");
    expect(mockSetGuestBar).not.toHaveBeenCalled();
    expect(mockOpenAuthModal).not.toHaveBeenCalled();
  });

  // P1-6: a returning guest merges rather than replaces their bar.
  it("seeds selections from the existing guest bar so re-running merges (P1-6)", () => {
    authState.barIngredientData = [
      { id: "Gin", name: "Gin", category: "Other" },
      { id: "Dry Vermouth", name: "Dry Vermouth", category: "Other" },
    ];
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    // Add one more ingredient on top of the seeded two.
    fireEvent.click(screen.getByRole("button", { name: /^Orange Bitters$/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /browse what i can make/i })
    );

    expect(mockSetGuestBar).toHaveBeenCalledTimes(1);
    const items = mockSetGuestBar.mock.calls[0][0] as { name: string }[];
    const names = items.map((i) => i.name);
    // Existing two are preserved (merged), plus the new one.
    expect(names).toContain("Gin");
    expect(names).toContain("Dry Vermouth");
    expect(names).toContain("Orange Bitters");
  });
});
