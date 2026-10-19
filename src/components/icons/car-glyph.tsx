import type { SVGProps } from "react";
import { CAR_GLYPH_PATH } from "./glyphs";

/** Car (front view) — driver trips. Decorative unless given a title/aria-label. */
export function CarGlyph({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" {...props}>
      <path fill="currentColor" fillRule="evenodd" d={CAR_GLYPH_PATH} />
    </svg>
  );
}
