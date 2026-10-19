"use client";

// docs_requested state: admin asked to re-upload specific documents.
// One card per requested doc → POST /drivers/verification/upload?category=…
// Previously this backend flow had no UI at all — users were stuck.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle, Upload } from "lucide-react";
import { api, extractError } from "@/lib/api/client";
import { useFriendlyError } from "@/lib/hooks/use-api-error";
import { compressImage, ImageValidationError } from "@/lib/utils/compress-image";
import { Button, Spinner } from "@/components/ui";
import { CameraCapture } from "@/components/features/driver/camera-capture";

const DOC_KEYS = ["license", "license_back", "car_passport", "car_passport_back", "car_photo", "selfie"] as const;
type DocKey = (typeof DOC_KEYS)[number];

function isDocKey(v: string): v is DocKey {
  return (DOC_KEYS as readonly string[]).includes(v);
}

export function ReuploadDocs({ requestedDocs, onDone }: {
  requestedDocs: string[];
  onDone: () => void;
}) {
  const t = useTranslations("driver_reg");
  const fe = useFriendlyError();
  const [activeDoc, setActiveDoc] = useState<DocKey | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const docs = requestedDocs.filter(isDocKey);

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ category, file }: { category: DocKey; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/drivers/verification/upload?category=${category}`, form);
      return category;
    },
    onSuccess: (category) => {
      setUploaded((prev) => new Set(prev).add(category));
      setError(null);
      // All requested docs re-sent → status flips back to pending on the server.
      if (docs.every((d) => d === category || uploaded.has(d))) onDone();
    },
    onError: (e) => setError(fe(extractError(e))),
  });

  const pickFile = (doc: DocKey) => {
    setActiveDoc(doc);
    setCameraOpen(true);
  };

  const onCapture = async (file: File) => {
    setCameraOpen(false);
    if (!activeDoc) return;
    setError(null);
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      mutate({ category: activeDoc, file: compressed });
    } catch (err) {
      // err.message is a raw reason code («too_small») — never show it as-is.
      setError(
        err instanceof ImageValidationError && err.reason === "too_small"
          ? t("photo_too_small")
          : t("doc_error_generic"),
      );
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[480px] p-6 pt-12">
      <h1 className="text-[20px] font-900 text-ink-900 dark:text-white">{t("reupload_title")}</h1>
      <p className="mt-2 text-[15px] font-600 text-ink-500">{t("reupload_desc")}</p>

      {cameraOpen && activeDoc && (
        <CameraCapture
          kind={activeDoc === "selfie" ? "selfie" : activeDoc === "car_photo" ? "car" : "document"}
          onClose={() => setCameraOpen(false)}
          onCapture={(f) => void onCapture(f)}
        />
      )}

      <div className="mt-5 space-y-2.5">
        {docs.map((doc) => {
          const done = uploaded.has(doc);
          return (
            <button
              key={doc}
              type="button"
              disabled={done || isPending || compressing}
              onClick={() => pickFile(doc)}
              className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left shadow-card disabled:opacity-60 dark:bg-ink-900"
            >
              <span className="text-[15px] font-800 text-ink-900 dark:text-white">
                {t(`doc_${doc}_label`)}
              </span>
              {done ? (
                <CheckCircle className="h-5 w-5 text-brand-500" aria-hidden="true" />
              ) : isPending && activeDoc === doc ? (
                <Spinner size={16} />
              ) : (
                <Upload className="h-5 w-5 text-ink-400" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[14px] font-700 text-coral-500">{error}</p>}

      {docs.every((d) => uploaded.has(d)) && (
        <Button variant="primary" size="md" className="mt-5 w-full" onClick={onDone}>
          {t("reupload_done")}
        </Button>
      )}
    </div>
  );
}
