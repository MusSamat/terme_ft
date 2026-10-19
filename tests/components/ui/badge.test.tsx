import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, VerifiedBadge, PendingBadge, SeatsBadge } from "@/components/ui/badge";

vi.mock("next-intl", async () => {
  const messages = (await import("@/messages/ru.json")).default as unknown as Record<
    string,
    Record<string, string>
  >;
  return {
    useTranslations:
      (ns: string) =>
      (key: string, params?: Record<string, unknown>): string => {
        let s = messages[ns]?.[key] ?? `${ns}.${key}`;
        for (const [k, v] of Object.entries(params ?? {})) s = s.replace(`{${k}}`, String(v));
        return s;
      },
  };
});

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("renders icon alongside children", () => {
    render(<Badge icon={<span data-testid="icon" />}>Label</Badge>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Label")).toBeInTheDocument();
  });

  it("applies danger variant classes (danger tokens)", () => {
    const { container } = render(<Badge variant="danger">Error</Badge>);
    expect(container.firstChild).toHaveClass("bg-danger-100", "text-danger-600");
  });

  it("applies success variant classes (brand tokens)", () => {
    const { container } = render(<Badge variant="success">OK</Badge>);
    expect(container.firstChild).toHaveClass("bg-brand-50", "text-brand-700");
  });

  it("applies neutral variant by default (ink tokens)", () => {
    const { container } = render(<Badge>Neutral</Badge>);
    expect(container.firstChild).toHaveClass("bg-ink-100", "text-ink-600");
  });

  it("merges custom className", () => {
    const { container } = render(<Badge className="extra">x</Badge>);
    expect(container.firstChild).toHaveClass("extra");
  });
});

describe("VerifiedBadge", () => {
  it("renders Верифицирован", () => {
    render(<VerifiedBadge />);
    expect(screen.getByText("Верифицирован")).toBeInTheDocument();
  });

  it("uses verified (brand) variant", () => {
    const { container } = render(<VerifiedBadge />);
    expect(container.firstChild).toHaveClass("bg-brand-50", "text-brand-700");
  });
});

describe("PendingBadge", () => {
  it("renders Ожидание", () => {
    render(<PendingBadge />);
    expect(screen.getByText("Ожидание")).toBeInTheDocument();
  });

  it("uses pending (accent) variant", () => {
    const { container } = render(<PendingBadge />);
    expect(container.firstChild).toHaveClass("bg-accent-100", "text-accent-700");
  });
});

describe("SeatsBadge", () => {
  it("renders available out of total", () => {
    render(<SeatsBadge available={2} total={4} />);
    expect(screen.getByText(/2 из 4/)).toBeInTheDocument();
  });

  it("renders zero available", () => {
    render(<SeatsBadge available={0} total={4} />);
    expect(screen.getByText(/0 из 4/)).toBeInTheDocument();
  });

  it("uses seats (ink) variant", () => {
    const { container } = render(<SeatsBadge available={2} total={4} />);
    expect(container.firstChild).toHaveClass("bg-ink-100", "text-ink-600");
  });
});
