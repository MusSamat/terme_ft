// Curated top intercity pairs for SEO landing pages (/route/{from}-{to}).
// Slugs are fixed strings (matched whole, never parsed) so hyphenated city
// slugs like "cholpon-ata" stay unambiguous.

export interface RouteCity {
  key: string;
  slug: string;
  nameRu: string;
  nameKg: string;
}

const CITIES: Record<string, RouteCity> = {
  bishkek: { key: "bishkek", slug: "bishkek", nameRu: "Бишкек", nameKg: "Бишкек" },
  osh: { key: "osh", slug: "osh", nameRu: "Ош", nameKg: "Ош" },
  karakol: { key: "karakol", slug: "karakol", nameRu: "Каракол", nameKg: "Каракол" },
  naryn: { key: "naryn", slug: "naryn", nameRu: "Нарын", nameKg: "Нарын" },
  talas: { key: "talas", slug: "talas", nameRu: "Талас", nameKg: "Талас" },
  "cholpon-ata": {
    key: "cholpon-ata",
    slug: "cholpon-ata",
    nameRu: "Чолпон-Ата",
    nameKg: "Чолпон-Ата",
  },
  manas: {
    key: "manas",
    slug: "manas",
    nameRu: "Манас",
    nameKg: "Манас",
  },
  "issyk-kul": {
    key: "issyk-kul",
    slug: "issyk-kul",
    nameRu: "Иссык-Куль",
    nameKg: "Ысык-Көл",
  },
};

// Both directions for the hub routes; extra inter-regional pairs one-way plus reverse.
const PAIR_KEYS: readonly [string, string][] = [
  ["bishkek", "osh"],
  ["osh", "bishkek"],
  ["bishkek", "karakol"],
  ["karakol", "bishkek"],
  ["bishkek", "cholpon-ata"],
  ["cholpon-ata", "bishkek"],
  ["bishkek", "naryn"],
  ["naryn", "bishkek"],
  ["bishkek", "talas"],
  ["talas", "bishkek"],
  ["bishkek", "manas"],
  ["manas", "bishkek"],
  ["bishkek", "issyk-kul"],
  ["issyk-kul", "bishkek"],
  ["osh", "manas"],
  ["manas", "osh"],
  ["osh", "naryn"],
  ["naryn", "osh"],
  ["karakol", "cholpon-ata"],
  ["cholpon-ata", "karakol"],
];

export interface RoutePair {
  slug: string;
  from: RouteCity;
  to: RouteCity;
}

function city(key: string): RouteCity {
  const c = CITIES[key];
  if (!c) throw new Error(`Unknown route city: ${key}`);
  return c;
}

export const ROUTE_PAIRS: readonly RoutePair[] = PAIR_KEYS.map(([f, t]) => {
  const from = city(f);
  const to = city(t);
  return { slug: `${from.slug}-${to.slug}`, from, to };
});

export function findRoutePair(slug: string): RoutePair | null {
  return ROUTE_PAIRS.find((p) => p.slug === slug) ?? null;
}

/** A few other curated routes to cross-link from a given pair (internal links). */
export function relatedRoutePairs(slug: string, count = 4): RoutePair[] {
  return ROUTE_PAIRS.filter((p) => p.slug !== slug).slice(0, count);
}
