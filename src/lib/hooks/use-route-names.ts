"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { routeNames } from "@/lib/places";

/** Localised «from / to» names for any trip / request / booking-trip shape. */
export function useRouteNames() {
  const locale = useLocale();
  return useCallback((x: Parameters<typeof routeNames>[0]) => routeNames(x, locale), [locale]);
}
