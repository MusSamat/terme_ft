import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { PasswordInput } from "@/components/ui/password-input";

vi.mock("next-intl", async () => {
  const messages = (await import("@/messages/ru.json")).default as unknown as Record<string, unknown>;
  const lookup = (path: string): string | undefined => {
    let node: unknown = messages;
    for (const part of path.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
    return typeof node === "string" ? node : undefined;
  };
  return { useTranslations: (ns: string) => (key: string) => lookup(`${ns}.${key}`) ?? `${ns}.${key}` };
});

describe("PasswordInput", () => {
  it("renders an input of type password initially", () => {
    render(<PasswordInput />);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe("password");
  });

  it("clicking toggle button changes type to text (shows password)", () => {
    render(<PasswordInput />);
    const toggle = screen.getByRole("button", { name: "Показать пароль" });
    fireEvent.click(toggle);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("text");
  });

  it("clicking toggle again restores type password", () => {
    render(<PasswordInput />);
    const toggle = screen.getByRole("button", { name: "Показать пароль" });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Скрыть пароль" }));
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("toggle button aria-label changes with state", () => {
    render(<PasswordInput />);
    expect(screen.getByRole("button", { name: "Показать пароль" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(screen.getByRole("button", { name: "Скрыть пароль" })).toBeInTheDocument();
  });

  it("invalid=true marks the input invalid and applies the error ring", () => {
    const { container } = render(<PasswordInput invalid={true} />);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(container.firstChild).toHaveClass("ring-danger-400");
  });

  it("forwards ref to the input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
