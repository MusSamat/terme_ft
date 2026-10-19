import type { SVGProps } from "react";
import { PASSENGER_GLYPH_PATHS } from "./glyphs";

/** Person — passenger requests. Decorative unless given a title/aria-label. */
export function PassengerGlyph({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" {...props}>
      {PASSENGER_GLYPH_PATHS.map((d) => (
        <path key={d} fill="currentColor" d={d} />
      ))}
    </svg>
  );
}
