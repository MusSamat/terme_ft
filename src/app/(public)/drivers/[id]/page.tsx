import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";
import { Award, Car, Hash, Palette, Calendar, Users, Star } from "lucide-react";
import { getPublicUser, getUserRatings, type PublicUser, type PublicRating } from "@/lib/api/users";
import Link from "next/link";
import { extractError } from "@/lib/api/client";
import { normalizeMediaUrl } from "@/lib/utils/media-url";
import { BackButton, Container, DriverAvatar, RatingStars, VerifiedBadge } from "@/components/ui";

export const revalidate = 300;

interface Props {
  params: { id: string };
}

async function fetchData(id: string): Promise<{ user: PublicUser; ratings: PublicRating[] } | null> {
  try {
    const [user, ratings] = await Promise.all([
      getPublicUser(id),
      getUserRatings(id, undefined, 10).catch(() => ({ data: [], nextCursor: null })),
    ]);
    return { user, ratings: ratings.data };
  } catch (e) {
    const code = extractError(e).code;
    if (code === "NOT_FOUND" || code === "VALIDATION_ERROR") return null;
    // Outage / 5xx: error boundary, not a 404 cached for revalidate=300.
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations("drivers");
  const d = await fetchData(params.id);
  if (!d) return { title: t("not_found_title"), robots: { index: false } };
  const { user } = d;
  const isDriver = (user.roles ?? []).includes("driver");
  const rating = user.rating ?? 0;
  const ratingCount = user.ratingCount ?? 0;
  const roleLabel = isDriver ? t("driver_role") : t("passenger_role");
  const title = `${user.name} — ${roleLabel} Terme`;
  const desc = `${user.name}${ratingCount >= 3 ? ` · ${rating.toFixed(1)}★ (${ratingCount} ${t("ratings_count")})` : ` · ${t("new_role", { role: roleLabel })}`} · Terme`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/drivers/${params.id}` },
    openGraph: { title, description: desc, type: "profile" },
  };
}

const TIER_COLORS: Record<string, string> = {
  traveler: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30",
  expert: "bg-brand-100 text-brand-800 border-brand-300 dark:bg-brand-500/20 dark:text-brand-200 dark:border-brand-500/40",
  elite: "bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-500/10 dark:text-accent-300 dark:border-accent-500/30",
};

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-3xl border border-ink-100 bg-white p-4 text-center shadow-card dark:border-ink-800 dark:bg-ink-900">
      <Icon className="h-5 w-5 text-brand-500" aria-hidden="true" />
      <span className="font-disp text-[22px] font-900 leading-none text-ink-900 dark:text-white">{value}</span>
      <span className="text-[13px] font-700 text-ink-500 dark:text-ink-400">{label}</span>
    </div>
  );
}

export default async function UserProfilePage({ params }: Props) {
  const t = await getTranslations("drivers");
  // Raw codes (tier / rating tags) → labels; unknown codes fall back to the code.
  const messages = (await getMessages()) as { loyalty?: { tiers?: Record<string, string> }; ratings?: { tags?: Record<string, string> } };
  const tierLabel = (k: string) => messages.loyalty?.tiers?.[k] ?? k;
  const tagLabel = (k: string) => messages.ratings?.tags?.[k] ?? k;
  const tComplaint = await getTranslations("complaint");
  const d = await fetchData(params.id);
  if (!d) notFound();
  const { user, ratings } = d;

  const isDriver = (user.roles ?? []).includes("driver");
  const car = user.driverCar ?? null;
  const rating = user.rating ?? null;
  const ratingCount = user.ratingCount ?? 0;
  const loyaltyTier = user.loyaltyTier && user.loyaltyTier !== "novice" ? user.loyaltyTier : null;
  const joinYear = user.createdAt ? new Date(user.createdAt).getFullYear() : null;

  return (
    <Container className="py-6 lg:py-10">
      <BackButton />
      {/* Hero */}
      <div className="mb-5 flex flex-col items-center gap-4 rounded-4xl border border-ink-100 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900 sm:flex-row sm:items-start sm:text-left">
        <DriverAvatar name={user.name ?? "?"} src={user.avatarUrl ?? null} size="lg" />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-disp text-[22px] font-900 text-ink-900 dark:text-white">{user.name}</h1>
            {isDriver && <VerifiedBadge />}
            {loyaltyTier && (
              <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-800 ${TIER_COLORS[loyaltyTier] ?? ""}`}>
                <Award className="h-3 w-3" aria-hidden="true" />
                {tierLabel(loyaltyTier)}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {rating !== null && ratingCount >= 3 ? (
              <RatingStars value={rating} size={15} showValue />
            ) : (
              <span className="text-[14px] text-ink-500 dark:text-ink-400">
                {t("new_role", { role: isDriver ? t("driver_role") : t("passenger_role") })}
              </span>
            )}
            {ratingCount > 0 && (
              <span className="text-[13px] text-ink-500 dark:text-ink-400">· {ratingCount} {t("ratings_count")}</span>
            )}
            {joinYear && (
              <span className="text-[13px] text-ink-400">· {t("since", { year: joinYear })}</span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-700 ${isDriver ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300" : "border-ink-200 bg-ink-50 text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"}`}>
              {isDriver ? `🚗 ${t("driver_badge")}` : `👤 ${t("passenger_badge")}`}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className={`mb-5 grid gap-3 ${isDriver ? "grid-cols-3" : "grid-cols-2"}`}>
        <StatCard icon={Star} label={t("rating_label")} value={rating !== null ? rating.toFixed(1) : "—"} />
        <StatCard icon={Users} label={t("ratings_label")} value={String(ratingCount)} />
        {isDriver && car && (
          <StatCard icon={Car} label={t("trips_label")} value={String(car.totalTrips)} />
        )}
      </div>

      {/* Car section — driver only */}
      {isDriver && car && (
        <div className="mb-5 overflow-hidden rounded-4xl border border-ink-100 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
          {/* Car photo */}
          {car.carPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={normalizeMediaUrl(car.carPhotoUrl) ?? car.carPhotoUrl}
              alt={`${car.make} ${car.model}`}
              className="h-52 w-full object-cover sm:h-64"
            />
          )}

          <div className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-disp text-[16px] font-900 text-ink-900 dark:text-white">
              <Car className="h-4 w-4 text-brand-600" aria-hidden="true" />
              {t("car_section")}
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-800 uppercase tracking-widest text-ink-400">{t("car_make_model")}</p>
                <p className="mt-0.5 text-[15px] font-800 text-ink-900 dark:text-white">{car.make} {car.model}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-ink-400" aria-hidden="true" />
                  <p className="text-[11px] font-800 uppercase tracking-widest text-ink-400">{t("car_year")}</p>
                </div>
                <p className="mt-0.5 text-[15px] font-800 text-ink-900 dark:text-white">{car.year}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Palette className="h-3 w-3 text-ink-400" aria-hidden="true" />
                  <p className="text-[11px] font-800 uppercase tracking-widest text-ink-400">{t("car_color")}</p>
                </div>
                <p className="mt-0.5 text-[15px] font-800 text-ink-900 dark:text-white">{car.color}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3 text-ink-400" aria-hidden="true" />
                  <p className="text-[11px] font-800 uppercase tracking-widest text-ink-400">{t("car_plate")}</p>
                </div>
                <p className="mt-0.5 font-mono text-[16px] font-900 tracking-wider text-brand-700 dark:text-brand-300">{car.plate}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-ink-400" aria-hidden="true" />
                  <p className="text-[11px] font-800 uppercase tracking-widest text-ink-400">{t("car_seats")}</p>
                </div>
                <p className="mt-0.5 text-[15px] font-800 text-ink-900 dark:text-white">{car.seats}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews */}
      <section>
        <h2 className="mb-3 font-disp text-[18px] font-900 text-ink-900 dark:text-white">
          {t("reviews_title")} {ratingCount > 0 && <span className="text-ink-400">({ratingCount})</span>}
        </h2>
        {ratings.length === 0 ? (
          <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-card dark:border-ink-800 dark:bg-ink-900">
            <p className="text-[15px] font-700 text-ink-500 dark:text-ink-400">{t("no_reviews")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {ratings.map((r) => (
              <li key={r.id} className="rounded-3xl border border-ink-100 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
                <div className="flex items-start gap-3">
                  <DriverAvatar name={r.rater?.name ?? "?"} src={r.rater?.avatarUrl ?? null} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-800 text-ink-900 dark:text-white">{r.rater?.name}</span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-800 text-accent-600 dark:text-accent-300">
                        <Star className="h-3.5 w-3.5 fill-accent-500 stroke-accent-500" aria-hidden="true" />
                        {r.score}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-[14px] leading-relaxed text-ink-700 dark:text-ink-300">{r.comment}</p>}
                    {r.tags && r.tags.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {r.tags.map((tag) => (
                          <li key={tag} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[13px] font-700 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
                            {tagLabel(tag)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {/* Complaint entry point (the form needs a target user). */}
      <div className="mt-6 text-center">
        <Link
          href={`/complaint?user=${params.id}`}
          className="text-[14px] font-700 text-ink-400 underline-offset-2 hover:text-ink-600 hover:underline dark:hover:text-ink-200"
        >
          {tComplaint("title")}
        </Link>
      </div>
    </Container>
  );
}
