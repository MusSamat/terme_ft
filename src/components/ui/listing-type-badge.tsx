import { CarFront, Hand } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ListingType = "trip" | "request";

/** Chip distinguishing a driver trip (teal) from a passenger request (neutral) — icon + label carry the meaning. */
export function ListingTypeBadge({ type, className }: { type: ListingType; className?: string }) {
  const isTrip = type === "trip";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-extrabold",
        isTrip ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-700",
        className,
      )}
    >
      {isTrip ? (
        <CarFront className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Hand className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {isTrip ? "Поездка" : "Заявка"}
    </span>
  );
}
