"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { uploadAvatar } from "@/lib/api/profile";
import { useAuth } from "@/store/auth";
import { normalizeMediaUrl } from "@/lib/utils/media-url";
import { toastSuccess } from "@/components/layout/quick-toast";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

function avatarInitials(name?: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("blob")); return; }
          // Use the blob's actual type — canvas may return PNG on some browsers
          // even when JPEG is requested (spec allows fallback to PNG).
          const ext = blob.type === "image/png" ? "avatar.png" : "avatar.jpg";
          resolve(new File([blob], ext, { type: blob.type }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface AvatarUploaderProps {
  /** wrapper size classes, e.g. "h-16 w-16" */
  sizeClass?: string;
  /** rounded shape, e.g. "rounded-2xl" (default circle) */
  shapeClass?: string;
  /** role-tinted fallback tile (bg + text) */
  tintClass?: string;
  /** camera FAB colour, e.g. "bg-brand-600" */
  fabClass?: string;
  /** initials font size, e.g. "text-[21px]" */
  fontClass?: string;
}

export function AvatarUploader({
  sizeClass = "h-32 w-32",
  shapeClass = "rounded-full",
  tintClass = "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200",
  fabClass = "bg-brand-600",
  fontClass = "text-[30px]",
}: AvatarUploaderProps = {}) {
  const t = useTranslations("profile_forms");
  const tToasts = useTranslations("toasts");
  const user = useAuth((s) => s.user);
  const updateUser = useAuth((s) => s.updateUser);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const revokeBlob = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };
  // imgSrc: either blob URL during upload or real CDN URL after success
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (file: File) => {
      const compressed = await compressImage(file);
      return uploadAvatar(compressed);
    },
    onSuccess: (updated) => {
      const url = normalizeMediaUrl(updated.avatarUrl);
      updateUser({ avatarUrl: url ?? undefined });
      setImgSrc(url);
      setImgError(false);
      revokeBlob(); // free the optimistic preview blob (now replaced by the CDN url)
      toastSuccess(tToasts("avatar_updated"));
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => {
      revokeBlob();
      setImgSrc(null);
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show optimistic preview immediately (revoke any prior preview first).
    revokeBlob();
    blobUrlRef.current = URL.createObjectURL(file);
    setImgSrc(blobUrlRef.current);
    setImgError(false);
    mutate(file);
    e.target.value = "";
  };

  // Resolve display src: explicit imgSrc overrides store value
  const displaySrc = imgSrc ?? (imgError ? null : normalizeMediaUrl(user?.avatarUrl));

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className={cn(
          "group relative overflow-hidden transition",
          sizeClass,
          shapeClass,
          isPending && "opacity-70",
        )}
        aria-label={t("avatar_upload")}
      >
        {displaySrc ? (
          // Plain <img> — avoids next/image fill quirks; unoptimized anyway
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displaySrc}
            alt={t("avatar_alt")}
            className="h-full w-full object-cover"
            onError={() => {
              setImgSrc(null);
              setImgError(true);
            }}
          />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center font-900", tintClass, fontClass)}>
            {avatarInitials(user?.name)}
          </div>
        )}

        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {isPending && <Spinner size={20} />}
        </span>
      </button>

      <span
        className={cn(
          "pointer-events-none absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-white dark:ring-ink-900",
          fabClass,
        )}
        aria-hidden="true"
      >
        <Camera className="h-3.5 w-3.5" />
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
      />
      {error && (
        <p className="absolute -bottom-6 left-0 whitespace-nowrap text-caption text-danger-500">{t("upload_error")}</p>
      )}
    </div>
  );
}
