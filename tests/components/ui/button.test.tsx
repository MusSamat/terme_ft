import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("has type=button by default (does not submit forms accidentally)", () => {
    render(<Button>x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("accepts type override", () => {
    render(<Button type="submit">x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop set", () => {
    render(<Button disabled>x</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("variants", () => {
    it("brand is the default variant (neutral filled)", () => {
      render(<Button>x</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-ink-900");
    });

    it.each([
      ["cta", "bg-accent-500"],
      ["brand", "bg-ink-900"],
      ["ghost", "bg-ink-100"],
      ["textGhost", "bg-transparent"],
      ["invert", "bg-ink-900"],
      ["dangerSoft", "bg-danger-50"],
      ["lock", "bg-ink-100"],
    ] as const)("%s variant applies %s", (variant, cls) => {
      render(<Button variant={variant}>x</Button>);
      expect(screen.getByRole("button")).toHaveClass(cls);
    });

    it("outline variant applies border classes", () => {
      render(<Button variant="outline">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("border-2", "border-ink-200");
    });
  });

  describe("deprecated aliases", () => {
    it("submit aliases cta (amber)", () => {
      render(<Button variant="submit">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-accent-500");
    });

    it("primary aliases brand (neutral filled)", () => {
      render(<Button variant="primary">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-ink-900");
    });

    it("secondary stays brand-tinted", () => {
      render(<Button variant="secondary">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-brand-50");
    });

    it("danger stays solid destructive", () => {
      render(<Button variant="danger">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("bg-danger-500");
    });

    it("pill variant is rounded-full", () => {
      render(<Button variant="pill">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("rounded-full", "bg-accent-500");
    });
  });

  describe("sizes", () => {
    it("applies sm size class", () => {
      render(<Button size="sm">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-9");
    });

    it("applies lg size class", () => {
      render(<Button size="lg">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-12");
    });

    it("applies xl size class", () => {
      render(<Button size="xl">x</Button>);
      expect(screen.getByRole("button")).toHaveClass("h-14");
    });
  });

  it("pill prop makes any variant rounded-full", () => {
    render(<Button variant="brand" pill>x</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-full");
  });

  it("merges custom className", () => {
    render(<Button className="my-custom-class">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("my-custom-class");
  });

  it("forwards ref to underlying button element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
