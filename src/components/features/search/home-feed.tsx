"use client";

import { SearchHub } from "./search-hub";

// Home `/` — the search HUB only: rails on top (destinations · popular ·
// history) + a docked search bar that opens the search modal. Submitting
// navigates to the results page (/trips or /requests); results never render
// here, keeping the main page a clean entry surface.
export function HomeFeed() {
  return <SearchHub />;
}
