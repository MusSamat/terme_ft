// Shared map/listing glyphs (viewBox 0 0 24 24, fill = currentColor) — the
// same paths as the mobile app (map marker spec). Car = driver trip,
// passenger = passenger request.
export const CAR_GLYPH_PATH =
  "M6.2 5.8C6.5 4.7 7.5 4 8.6 4h6.8c1.1 0 2.1.7 2.4 1.8L19 10h.5c.8 0 1.5.7 1.5 1.5V17c0 .6-.4 1-1 1h-1v1.5c0 .8-.7 1.5-1.5 1.5S16 20.3 16 19.5V18H8v1.5C8 20.3 7.3 21 6.5 21S5 20.3 5 19.5V18H4c-.6 0-1-.4-1-1v-5.5C3 10.7 3.7 10 4.5 10H5l1.2-4.2ZM7.3 10h9.4l-.9-3.3c-.1-.4-.5-.7-.9-.7H9.1c-.4 0-.8.3-.9.7L7.3 10ZM7 15.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Zm10 0a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8ZM10 14.2h4v1.4h-4z";

export const PASSENGER_GLYPH_PATHS = [
  "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  "M5 19.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5Z",
] as const;

export type GlyphKind = "car" | "passenger";

/** Inner SVG markup (paths only) for HTML-string icons (Leaflet divIcon). */
export function glyphPathsMarkup(kind: GlyphKind): string {
  return kind === "car"
    ? `<path fill="currentColor" fill-rule="evenodd" d="${CAR_GLYPH_PATH}"/>`
    : PASSENGER_GLYPH_PATHS.map((d) => `<path fill="currentColor" d="${d}"/>`).join("");
}
