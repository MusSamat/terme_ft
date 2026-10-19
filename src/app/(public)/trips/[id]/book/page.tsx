import { redirect } from "next/navigation";

interface Props {
  params: { id: string };
  searchParams: { seats?: string };
}

/**
 * The booking form is now an ActionModal launched from the trip detail CTA
 * (design overhaul). This route stays valid for deep links / bookmarks by
 * redirecting to the detail page with the booking modal auto-opened.
 */
export default function BookTripPage({ params, searchParams }: Props) {
  const seats = Number(searchParams.seats);
  redirect(`/trips/${params.id}?book=1${Number.isInteger(seats) && seats > 0 ? `&seats=${seats}` : ""}`);
}
