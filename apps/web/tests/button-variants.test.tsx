import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button Component Variants & Contrast", () => {
  it("renders default variant with high-contrast text", () => {
    render(<Button variant="default">Primary CTA</Button>);
    const btn = screen.getByRole("button", { name: /primary cta/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("text-primary-foreground");
  });

  it("renders secondary variant with visible text token", () => {
    render(<Button variant="secondary">Secondary Action</Button>);
    const btn = screen.getByRole("button", { name: /secondary action/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-secondary");
    expect(btn.className).toContain("text-secondary-foreground");
  });

  it("renders outline variant with visible foreground text", () => {
    render(<Button variant="outline">Outline Option</Button>);
    const btn = screen.getByRole("button", { name: /outline option/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("border");
    expect(btn.className).toContain("text-foreground");
  });

  it("renders ghost variant with visible foreground text", () => {
    render(<Button variant="ghost">Ghost Nav Item</Button>);
    const btn = screen.getByRole("button", { name: /ghost nav item/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("text-foreground");
  });

  it("renders destructive variant with destructive foreground text", () => {
    render(<Button variant="destructive">Delete Item</Button>);
    const btn = screen.getByRole("button", { name: /delete item/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-destructive");
    expect(btn.className).toContain("text-destructive-foreground");
  });

  it("renders link variant with primary colored text", () => {
    render(<Button variant="link">Read Terms</Button>);
    const btn = screen.getByRole("button", { name: /read terms/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("text-primary");
  });

  it("applies disabled classes and HTML attribute when disabled", () => {
    render(<Button disabled>Disabled Action</Button>);
    const btn = screen.getByRole("button", { name: /disabled action/i });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("disabled:opacity-50");
    expect(btn.className).toContain("disabled:pointer-events-none");
  });
});
