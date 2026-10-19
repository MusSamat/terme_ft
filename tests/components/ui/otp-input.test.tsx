import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createRef } from "react";
import { OtpInput, type OtpInputHandle } from "@/components/ui/otp-input";

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

describe("OtpInput", () => {
  it("renders 6 input cells by default", () => {
    render(<OtpInput />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("renders custom length", () => {
    render(<OtpInput length={4} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("has group role with WhatsApp code label", () => {
    render(<OtpInput />);
    expect(screen.getByRole("group", { name: "Код из WhatsApp" })).toBeInTheDocument();
  });

  it("each cell has an individual aria-label", () => {
    render(<OtpInput length={3} />);
    expect(screen.getByLabelText("Цифра 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Цифра 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Цифра 3")).toBeInTheDocument();
  });

  it("calls onChange when a digit is typed", () => {
    const onChange = vi.fn();
    render(<OtpInput onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0]!, { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith("1");
  });

  it("typing a digit moves focus to the next cell", () => {
    render(<OtpInput />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0]!, { target: { value: "1" } });
    expect(inputs[1]).toHaveFocus();
  });

  it("backspace on an empty cell moves focus to the previous cell", () => {
    render(<OtpInput />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0]!, { target: { value: "1" } });
    fireEvent.keyDown(inputs[1]!, { key: "Backspace" });
    expect(inputs[0]).toHaveFocus();
  });

  it("fills cells from paste and calls onComplete", () => {
    const onComplete = vi.fn();
    render(<OtpInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => "123456" },
    });
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("paste fills all cell values", () => {
    render(<OtpInput />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => "123456" },
    });
    expect(inputs.map((i) => i.value).join("")).toBe("123456");
  });

  it("paste strips non-digits", () => {
    render(<OtpInput />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => "12 AB 34" },
    });
    // Strips non-digits: "1234" → fills first 4 cells
    expect(inputs[0]!.value).toBe("1");
    expect(inputs[3]!.value).toBe("4");
  });

  it("ignores paste of non-digit-only string with no digits", () => {
    const onChange = vi.fn();
    render(<OtpInput onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => "abc" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("invalid prop applies aria-invalid on all cells", () => {
    render(<OtpInput invalid />);
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("clear() handle resets all cells to empty", () => {
    const ref = createRef<OtpInputHandle>();
    render(<OtpInput ref={ref} />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    fireEvent.change(inputs[0]!, { target: { value: "5" } });
    expect(inputs[0]!.value).toBe("5");
    act(() => {
      ref.current!.clear();
    });
    expect(inputs[0]!.value).toBe("");
  });

  it("does not call onComplete for partial paste", () => {
    const onComplete = vi.fn();
    render(<OtpInput length={6} onComplete={onComplete} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0]!, {
      clipboardData: { getData: () => "123" },
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
