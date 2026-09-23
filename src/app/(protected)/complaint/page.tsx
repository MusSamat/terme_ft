"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { submitComplaint, type ComplaintCategory } from "@/lib/api/complaints";
import { extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { Button, Label, Spinner, Textarea } from "@/components/ui";
import { ArrowLeft, Camera, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_IMAGES = 5;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic";

// Keys mirror the backend ComplaintCategory enum (safety | fraud | rudeness |
// no_show | other) — using any other value gets rejected server-side.
const CATEGORY_KEYS = ["safety", "fraud", "rudeness", "no_show", "other"] as const;

type FormData = {
  category: ComplaintCategory;
  description: string;
};

interface PageProps {
  searchParams: Promise<{ user?: string; trip?: string }>;
}

export default function ComplaintPage({ searchParams }: PageProps) {
  const t = useTranslations("complaint");
  const fe = useFriendlyError();
  const params = use(searchParams);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { value: ComplaintCategory; label: string }[] = CATEGORY_KEYS.map((k) => ({
    value: k,
    label: t(`categories.${k}`),
  }));

  const schema = z.object({
    category: z.enum(["safety", "fraud", "rudeness", "no_show", "other"]),
    description: z.string().min(20, t("description_min")).max(1000, t("description_max")),
  });

  // Backend requires targetUserId OR targetTripId — a complaint with neither is
  // rejected. Guard the client so the button never fires an unsatisfiable request.
  const hasTarget = Boolean(params.user || params.trip);

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "rudeness" },
  });

  const description = watch("description") ?? "";

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: (data: FormData) =>
      submitComplaint(
        { ...data, targetUserId: params.user, targetTripId: params.trip },
        images.length > 0 ? images : undefined,
      ),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    setImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(f);
    });

    // Reset input so same file can be re-selected if removed
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next;
    });
  };

  const errorMessage = error ? fe(extractError(error)) : null;

  if (isSuccess) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <CheckCircle className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-disp text-[22px] font-900 text-ink-900 dark:text-white">{t("success_title")}</h1>
        <p className="mt-2 text-[15px] font-600 text-ink-700 dark:text-ink-300">{t("success_hint")}</p>
        <Button variant="brand" size="md" className="mt-6" onClick={() => router.back()}>
          {t("back_btn")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1 text-[14px] font-800 text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back_btn")}
      </button>
      <h1 className="font-disp text-[22px] font-900 text-ink-900 dark:text-white">{t("title")}</h1>
      <p className="mt-1 text-[15px] font-600 text-ink-700 dark:text-ink-300">{t("subtitle")}</p>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="mt-6 space-y-5">
        {/* Category */}
        <div>
          <Label>{t("category_label")}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map(({ value, label }) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" value={value} {...register("category")} className="sr-only" />
                <span
                  className={cn(
                    "inline-block rounded-full border px-4 py-1.5 text-[15px] font-700 transition-colors",
                    watch("category") === value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-300"
                      : "border-ink-300 text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-300 dark:hover:border-brand-500",
                  )}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">{t("description_label")}</Label>
          <Textarea
            id="description"
            rows={5}
            maxLength={1000}
            placeholder={t("description_placeholder")}
            {...register("description")}
            className="mt-1"
          />
          <div className="mt-1 flex items-start justify-between gap-2">
            {errors.description ? (
              <p className="text-[13px] font-700 text-danger-600 dark:text-danger-400">{errors.description.message}</p>
            ) : (
              <span />
            )}
            <span className="text-[12px] text-ink-500 dark:text-ink-400">{description.length}/1000</span>
          </div>
        </div>

        {/* Image attachments */}
        <div>
          <Label>{t("photos_label")}</Label>
          <p className="mb-3 mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">
            {t("photos_hint", { n: MAX_IMAGES })}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={handleFileChange}
            aria-label={t("select_photos_label")}
          />

          <div className="flex flex-wrap gap-3">
            {/* Previews */}
            {previews.map((src, idx) => (
              <div key={idx} className="relative h-20 w-20 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={t("photo_alt", { n: idx + 1 })}
                  className="h-full w-full rounded-2xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white shadow-xs hover:bg-danger-600 dark:bg-ink-700"
                  aria-label={t("remove_photo_label", { n: idx + 1 })}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}

            {/* Add button */}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-300 text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-ink-700 dark:hover:border-brand-500"
                aria-label={t("add_photo_aria")}
              >
                <Camera className="h-5 w-5" aria-hidden="true" />
                <span className="text-[11px] font-800">
                  {images.length > 0 ? `${images.length}/${MAX_IMAGES}` : t("add_btn")}
                </span>
              </button>
            )}
          </div>
        </div>

        {!hasTarget && (
          <p className="rounded-xl bg-danger-50 px-3 py-2 text-[14px] font-700 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400">{t("no_target")}</p>
        )}

        {errorMessage && (
          <p className="rounded-xl bg-danger-50 px-3 py-2 text-[14px] font-700 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400">{errorMessage}</p>
        )}

        <Button type="submit" variant="cta" size="lg" disabled={isPending || !hasTarget} className="w-full">
          {isPending ? <Spinner size={18} /> : t("submit_btn")}
        </Button>
      </form>
    </div>
  );
}
