import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhoneInput } from "@/components/ui/phone-input";

// Post-redesign contract (commit "reg: changed input"): a single international
// input seeded with +996 (Kyrgyzstan). The whole E.164 value is editable — the
// user may delete +996 and type another country code. +996 caps at 9 national
// digits; the value is displayed grouped as "+996 700 123 456".

const PLACEHOLDER = "+996 700 123 456";

describe("PhoneInput", () => {
  it("renders the placeholder", () => {
    render(<PhoneInput />);
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
  });

  it("seeds an empty caller with +996 on mount", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput onValueChange={onValueChange} />);
    expect(onValueChange).toHaveBeenCalledWith("+996");
  });

  it("calls onValueChange with the full E.164 number on input", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput onValueChange={onValueChange} />);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "+996700123456" },
    });
    expect(onValueChange).toHaveBeenCalledWith("+996700123456");
  });

  it("strips non-digit characters from input", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput onValueChange={onValueChange} />);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "+996 700 abc" },
    });
    expect(onValueChange).toHaveBeenCalledWith("+996700");
  });

  it("caps +996 numbers at 9 national digits", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput onValueChange={onValueChange} />);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "+9967001234567890" },
    });
    expect(onValueChange).toHaveBeenCalledWith("+996700123456");
  });

  it("allows deleting +996 to type another country code", () => {
    const onValueChange = vi.fn();
    render(<PhoneInput value="+996700123456" onValueChange={onValueChange} />);
    onValueChange.mockClear();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "+7700123456" },
    });
    expect(onValueChange).toHaveBeenCalledWith("+7700123456");
  });

  it("formats the value grouped in threes for display", () => {
    render(<PhoneInput value="+996700123456" />);
    const input = screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement;
    expect(input.value).toBe("+996 700 123 456");
  });

  it("syncs with external value changes via useEffect", () => {
    const { rerender } = render(<PhoneInput value="+996700000000" />);
    const input = screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement;
    expect(input.value).toBe("+996 700 000 000");
    rerender(<PhoneInput value="+996555111222" />);
    expect(input.value).toBe("+996 555 111 222");
  });

  it("renders hint text when provided", () => {
    render(<PhoneInput hint="Введите номер" />);
    expect(screen.getByText("Введите номер")).toBeInTheDocument();
  });

  it("hint has error color and input is marked invalid when invalid", () => {
    render(<PhoneInput hint="Неверный номер" invalid />);
    const hint = screen.getByText("Неверный номер");
    expect(hint).toHaveClass("text-danger-500");
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveAttribute("aria-invalid", "true");
  });

  it("does not render hint when not provided", () => {
    render(<PhoneInput />);
    expect(screen.queryByText(/hint/i)).not.toBeInTheDocument();
  });
});
