import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotifCard } from "@/components/ui/notif-card";

describe("NotifCard", () => {
  it("renders children", () => {
    render(<NotifCard>Something happened</NotifCard>);
    expect(screen.getByText("Something happened")).toBeInTheDocument();
  });

  it("renders optional title prop", () => {
    render(<NotifCard title="Heads up">Body text</NotifCard>);
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });

  it("uses info variant by default (brand tokens)", () => {
    const { container } = render(<NotifCard>Info message</NotifCard>);
    expect(container.firstChild).toHaveClass("bg-brand-50", "border-l-brand-500");
  });

  it("error variant uses danger tokens", () => {
    const { container } = render(<NotifCard variant="error">Error message</NotifCard>);
    expect(container.firstChild).toHaveClass("bg-danger-100/40", "border-l-danger-500");
  });

  it("warning variant uses accent tokens", () => {
    const { container } = render(<NotifCard variant="warning">Warning message</NotifCard>);
    expect(container.firstChild).toHaveClass("bg-accent-50", "border-l-accent-500");
  });

  it("success variant uses teal border on brand background", () => {
    const { container } = render(<NotifCard variant="success">Success message</NotifCard>);
    expect(container.firstChild).toHaveClass("bg-brand-50", "border-l-brand-500");
  });

  it("renders custom icon when provided (overrides default icon)", () => {
    render(
      <NotifCard icon={<span data-testid="custom-icon" />}>With custom icon</NotifCard>,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
