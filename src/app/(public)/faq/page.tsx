import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n.config";
import { absoluteUrl, hreflangAlternates, ogLocales } from "@/lib/seo/site";
import { buildFaqJsonLd } from "@/lib/seo/org-jsonld";

interface FaqItem {
  q: string;
  a: string;
}

const PATH = "/faq";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("faq_page");
  const title = t("meta_title");
  const description = t("meta_desc");
  const url = absoluteUrl(PATH);

  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(PATH) },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Terme",
      ...ogLocales(locale),
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function FaqPage() {
  const t = await getTranslations("faq_page");
  // t.raw returns the untyped JSON node; shape is guaranteed by the message files.
  const items = t.raw("items") as FaqItem[];
  const jsonLd = buildFaqJsonLd(items);

  return (
    <div className="mx-auto max-w-[760px] px-5 py-10">
      {/* FAQPage JSON-LD — mirrors the Q&A rendered below; safe static values, no user HTML. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-[24px] font-900 text-ink-900 dark:text-white">{t("title")}</h1>
      <p className="mt-1 text-[14px] font-600 text-ink-400">{t("subtitle")}</p>

      <div className="mt-6 space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="rounded-2xl border border-ink-100 bg-white p-4 dark:border-ink-800 dark:bg-ink-900"
          >
            <summary className="cursor-pointer list-none text-[16px] font-900 text-ink-900 dark:text-white">
              {item.q}
            </summary>
            <p className="mt-2 text-[13.5px] font-500 leading-relaxed text-ink-600 dark:text-ink-300">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
