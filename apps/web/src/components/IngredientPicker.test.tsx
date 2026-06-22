import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IngredientPicker } from "@/components/IngredientPicker";

const items = [
  { name: "Gin", category: "Spirits" },
  { name: "Vodka", category: "Spirits" },
  { name: "Campari", category: "Liqueurs" },
  { name: "Soda Water", category: "Mixers & Soda" },
];

describe("IngredientPicker", () => {
  it("renders every item grouped, plus its category headers", () => {
    render(<IngredientPicker items={items} selected={[]} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /gin/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vodka/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /campari/i })).toBeInTheDocument();
    expect(screen.getByText("Spirits")).toBeInTheDocument();
    expect(screen.getByText("Liqueurs")).toBeInTheDocument();
  });

  it("filters items by the search box (case-insensitive)", () => {
    render(<IngredientPicker items={items} selected={[]} onToggle={vi.fn()} />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "vod" } });
    expect(screen.getByRole("button", { name: /vodka/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /campari/i })).not.toBeInTheDocument();
  });

  it("fires onToggle with the ingredient name when an item is clicked", () => {
    const onToggle = vi.fn();
    render(<IngredientPicker items={items} selected={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button", { name: /gin/i }));
    expect(onToggle).toHaveBeenCalledWith("Gin");
  });

  it("marks selected items with aria-pressed=true", () => {
    render(<IngredientPicker items={items} selected={["Gin"]} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /gin/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /vodka/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("shows a per-group selected count that updates with selection", () => {
    const { rerender } = render(
      <IngredientPicker items={items} selected={[]} onToggle={vi.fn()} />
    );
    // Spirits group: 0 of 2 selected
    expect(screen.getByText("Spirits").parentElement).toHaveTextContent("0 / 2");
    rerender(<IngredientPicker items={items} selected={["Gin"]} onToggle={vi.fn()} />);
    expect(screen.getByText("Spirits").parentElement).toHaveTextContent("1 / 2");
  });
});
