import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";

const mockPush = vi.fn();
const mockSetGuestBar = vi.fn();
const mockOpenAuthModal = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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
    user: null,
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
    mockSetGuestBar.mockClear();
    mockOpenAuthModal.mockClear();
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

  it("selecting an ingredient and continuing reaches the payoff count", () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Gin$/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/you can make/i)).toBeInTheDocument();
  });

  it("Skip sets the onboarded flag", () => {
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(localStorage.getItem(ONBOARDED_KEY)).toBeTruthy();
  });
});
