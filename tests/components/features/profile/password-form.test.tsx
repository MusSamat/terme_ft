import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Translations → pull the real ru.json strings.
vi.mock("next-intl", async () => {
  const messages = (await import("@/messages/ru.json")).default as unknown as Record<
    string,
    Record<string, string>
  >;
  return {
    useTranslations: (ns: string) => (key: string) => messages[ns]?.[key] ?? `${ns}.${key}`,
  };
});

// Spy the API call so we can assert it is (not) invoked.
const setPassword = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/api/auth", () => ({ changePassword: (...a: unknown[]) => setPassword(...a) }));

import { PasswordForm } from "@/components/features/profile/password-form";

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PasswordForm />
    </QueryClientProvider>,
  );
}

beforeEach(() => setPassword.mockClear());

describe("PasswordForm — change password", () => {
  it("does NOT submit when the current password is blank (the user's complaint)", async () => {
    const { container } = renderForm();
    fireEvent.change(container.querySelector("#newPassword")!, { target: { value: "newpass12" } });
    fireEvent.change(container.querySelector("#confirmPassword")!, { target: { value: "newpass12" } });
    // currentPassword left empty
    fireEvent.submit(container.querySelector("form")!);

    // A field-level error appears and the API is never called (no misleading
    // "wrong current password" round-trip).
    expect(await screen.findByText(/Введите текущий пароль/)).toBeInTheDocument();
    expect(setPassword).not.toHaveBeenCalled();
  });

  it("does NOT submit a new password without a digit", async () => {
    const { container } = renderForm();
    fireEvent.change(container.querySelector("#currentPassword")!, { target: { value: "oldpass12" } });
    fireEvent.change(container.querySelector("#newPassword")!, { target: { value: "onlyletters" } });
    fireEvent.change(container.querySelector("#confirmPassword")!, { target: { value: "onlyletters" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(setPassword).not.toHaveBeenCalled());
  });

  it("submits (newPassword, currentPassword) when everything is valid", async () => {
    const { container } = renderForm();
    fireEvent.change(container.querySelector("#currentPassword")!, { target: { value: "oldpass12" } });
    fireEvent.change(container.querySelector("#newPassword")!, { target: { value: "newpass34" } });
    fireEvent.change(container.querySelector("#confirmPassword")!, { target: { value: "newpass34" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(setPassword).toHaveBeenCalledWith("oldpass12", "newpass34"));
  });

  it("blocks a mismatched confirmation", async () => {
    const { container } = renderForm();
    fireEvent.change(container.querySelector("#currentPassword")!, { target: { value: "oldpass12" } });
    fireEvent.change(container.querySelector("#newPassword")!, { target: { value: "newpass34" } });
    fireEvent.change(container.querySelector("#confirmPassword")!, { target: { value: "different99" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(setPassword).not.toHaveBeenCalled());
  });
});
