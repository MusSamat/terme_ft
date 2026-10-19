"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { changePassword } from "@/lib/api/auth";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { useAuth } from "@/store/auth";
import { Button, Label, PasswordInput, Spinner } from "@/components/ui";

type FormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function PasswordForm() {
  const t = useTranslations("password_form");
  const fe = useFriendlyError();
  const phone = useAuth((s) => s.user?.phone ?? "");
  // Accounts created in the mobile app / Telegram bot have no password yet:
  // the first one is set with a WhatsApp code (forgot-password flow).
  const hasPassword = useAuth((s) => s.user?.hasPassword ?? true);

  const schema = z
    .object({
      // Required — the change-password UI is for users who already have one.
      // A blank field used to reach the backend and come back as a misleading
      // "wrong current password"; now it's a clear field error before submit.
      currentPassword: z.string().min(1, t("current_required")),
      newPassword: z.string().min(8, t("min_length")).regex(/\d/, t("needs_digit")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t("mismatch"),
      path: ["confirmPassword"],
    });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: (d: FormData) => changePassword(d.currentPassword, d.newPassword),
    onSuccess: () => reset(),
  });

  const reason = error ? extractError(error).details?.reason : undefined;
  // Only a real mismatch reads as «wrong current password»; rate limits, network
  // and new-password validation get their own message.
  const serverError = error
    ? reason === "current_password_mismatch"
      ? t("wrong_current")
      : fe(extractError(error))
    : null;
  const setViaWhatsapp = `/auth/login?step=forgot&phone=${encodeURIComponent(phone)}`;

  if (!hasPassword || reason === "password_not_set") {
    return (
      <div className="space-y-3">
        <p className="text-[14px] font-600 text-ink-500">{t("no_password_desc")}</p>
        <Link
          href={setViaWhatsapp}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-accent-500 px-5 text-[15px] font-900 text-accent-ink shadow-cta hover:bg-accent-400"
        >
          {t("set_via_whatsapp")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">{t("current_label")}</Label>
        <PasswordInput id="currentPassword" {...register("currentPassword")} className="mt-1" />
        {errors.currentPassword && (
          <p className="mt-1 text-caption text-coral-500">{errors.currentPassword.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="newPassword">{t("new_label")}</Label>
        <PasswordInput id="newPassword" {...register("newPassword")} className="mt-1" />
        {errors.newPassword && (
          <p className="mt-1 text-caption text-coral-500">{errors.newPassword.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="confirmPassword">{t("repeat_label")}</Label>
        <PasswordInput id="confirmPassword" {...register("confirmPassword")} className="mt-1" />
        {errors.confirmPassword && (
          <p className="mt-1 text-caption text-coral-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && <p className="text-caption text-coral-500">{serverError}</p>}
      <Link href={setViaWhatsapp} className="block text-[13px] font-800 text-brand-700 dark:text-brand-300">
        {t("forgot_current")}
      </Link>
      {isSuccess && <p className="text-caption text-brand-700">{t("success")}</p>}

      <Button type="submit" variant="primary" size="md" disabled={isPending}>
        {isPending ? <Spinner size={16} /> : t("title")}
      </Button>
    </form>
  );
}
