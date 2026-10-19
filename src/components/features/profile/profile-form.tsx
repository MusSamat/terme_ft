"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/lib/api/auth";
import { useAuth } from "@/store/auth";
import { toastSuccess } from "@/components/layout/quick-toast";
import { Button, Input, Label, Spinner } from "@/components/ui";

// Language is NOT part of this form: the single источник — LocaleSwitcher
// (settings tab / footer), which also syncs user.language to the backend.
// A second dropdown here used to silently overwrite the switcher's choice.
type FormData = { name: string; bio?: string };

export function ProfileForm() {
  const t = useTranslations("profile_forms");
  const tToasts = useTranslations("toasts");
  const user = useAuth((s) => s.user);
  const updateUser = useAuth((s) => s.updateUser);
  // Localized messages; the name is trimmed like the backend does.
  const schema = z.object({
    name: z.string().trim().min(2, t("name_min")).max(50, t("name_max")),
    bio: z.string().max(300).optional(),
  });

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      bio: (user as { bio?: string | null } | null)?.bio ?? "",
    },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: (data: FormData) => updateProfile(data),
    onSuccess: (updated) => {
      updateUser({ name: updated.name, ...( { bio: (updated as { bio?: string | null }).bio } as object ) });
      toastSuccess(tToasts("profile_saved"));
      // New baseline → the save button disables again until the next edit.
      reset({ name: updated.name ?? "", bio: (updated as { bio?: string | null }).bio ?? "" });
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
      <div>
        <Label htmlFor="name">{t("name_label")}</Label>
        <Input id="name" {...register("name")} className="mt-1" />
        {errors.name && <p className="mt-1 text-caption text-coral-500">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="bio">{t("bio_label")}</Label>
        <textarea
          id="bio"
          rows={3}
          maxLength={300}
          placeholder={t("bio_placeholder")}
          {...register("bio")}
          className="mt-1 w-full resize-none rounded-2xl border-2 border-ink-200 bg-white px-4 py-3 text-body-lg text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      {error && (
        <p className="text-caption text-coral-500">{t("save_error")}</p>
      )}

      <Button type="submit" variant="primary" size="md" disabled={!isDirty || isPending}>
        {isPending ? <Spinner size={16} /> : t("save")}
      </Button>
    </form>
  );
}
