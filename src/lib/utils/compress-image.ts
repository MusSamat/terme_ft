// Client-side image compression for document uploads (TZ §9.1 / §26.6).
// Validates the minimum dimensions, scales down to fit the max box, and lowers
// JPEG quality until the file is under the size cap. No third-party deps —
// uses the canvas API, same approach as car-photo-uploader.

export type ImageValidationReason = "too_small" | "unsupported_type" | "decode_failed";

export class ImageValidationError extends Error {
  constructor(public readonly reason: ImageValidationReason) {
    super(reason);
    this.name = "ImageValidationError";
  }
}

export interface CompressOptions {
  maxMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxMB: 5,
  maxWidth: 1600,
  maxHeight: 1200,
  minWidth: 800,
  minHeight: 600,
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageValidationError("decode_failed"));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageValidationError("decode_failed"))),
      "image/jpeg",
      quality,
    );
  });
}

function jpgName(original: string): string {
  const base = original.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.jpg`;
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxMB, maxWidth, maxHeight, minWidth, minHeight } = { ...DEFAULTS, ...opts };

  // Reject obviously non-image types up front (cameras sometimes send "" — those
  // fall through to the decode step, which rejects if it isn't really an image).
  if (file.type && !file.type.startsWith("image/")) {
    throw new ImageValidationError("unsupported_type");
  }

  const img = await loadImage(file);
  // Orientation-agnostic like the backend (lib/uploads.ts): 800×600 must also
  // accept a 600×800 portrait shot — compare sorted dimensions.
  const [dimMin, dimMax] = [Math.min(img.width, img.height), Math.max(img.width, img.height)];
  const [reqMin, reqMax] = [Math.min(minWidth, minHeight), Math.max(minWidth, minHeight)];
  if (dimMax < reqMax || dimMin < reqMin) {
    throw new ImageValidationError("too_small");
  }

  // Orientation-aware max box: a portrait shot must not be squeezed into the
  // landscape box (1080×1920 → 675×1200 broke the server's min-width check).
  const portrait = img.height > img.width;
  const boxW = portrait ? Math.min(maxWidth, maxHeight) : maxWidth;
  const boxH = portrait ? Math.max(maxWidth, maxHeight) : maxHeight;
  let scale = Math.min(1, boxW / img.width, boxH / img.height);
  // Never scale below the validated minimum — quality caps handle size instead.
  scale = Math.min(1, Math.max(scale, minWidth / img.width, minHeight / img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageValidationError("decode_failed");
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.9;
  let blob = await toBlob(canvas, quality);
  while (blob.size > maxMB * 1024 * 1024 && quality > 0.5) {
    quality = +(quality - 0.1).toFixed(2);
    blob = await toBlob(canvas, quality);
  }

  return new File([blob], jpgName(file.name), { type: "image/jpeg" });
}
