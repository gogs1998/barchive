// src/components/FlavorSciencePanel.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlavorSciencePanel } from "./FlavorSciencePanel";

describe("FlavorSciencePanel", () => {
  it("starts collapsed and toggles open", () => {
    render(
      <FlavorSciencePanel rating="Good" overall={72}>
        <p>meter body</p>
      </FlavorSciencePanel>
    );
    const btn = screen.getByRole("button", { name: /flavor science/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });
});
