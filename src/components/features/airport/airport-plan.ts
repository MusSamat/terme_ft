import { useQuery } from "@tanstack/react-query";
import { getAirports, type Airport, type FlightType } from "@/lib/api/cities";
import { listingTime } from "@/lib/airport";
import { setRouteParams, toRoutePlace, type RoutePlace } from "@/lib/places";

/** The three steps + flight of an airport transfer (search / publish / request). */
export interface AirportPlan {
  airportId: number | null;
  /** null = direction not picked yet. */
  toAirport: boolean | null;
  other: RoutePlace | null;
  /** Flight day «YYYY-MM-DD» and time «HH:MM» (KG): departure to / arrival from. */
  flightDate: string;
  flightTime: string;
  /** null = the airport's default. */
  flightType: FlightType | null;
  /** To the airport: when to leave (suggested, or edited by the user). */
  pickup: { date: string; time: string } | null;
  pickupEdited: boolean;
  flightNumber: string;
}

export const EMPTY_PLAN: AirportPlan = {
  airportId: null,
  toAirport: null,
  other: null,
  flightDate: "",
  flightTime: "",
  flightType: null,
  pickup: null,
  pickupEdited: false,
  flightNumber: "",
};

export function useAirports(enabled = true) {
  return useQuery({ queryKey: ["airports"], queryFn: getAirports, staleTime: 60 * 60_000, enabled });
}

/** from → to of the plan (null until the airport, direction and other end are set). */
export function planRoute(
  plan: AirportPlan,
  airport: Airport | null,
): { from: RoutePlace; to: RoutePlace } | null {
  if (!airport || plan.toAirport === null || !plan.other?.id) return null;
  const a = toRoutePlace(airport);
  return plan.toAirport ? { from: plan.other, to: a } : { from: a, to: plan.other };
}

/** Everything a search / listing needs is set (pickup known when going to the airport). */
export function planReady(plan: AirportPlan, airport: Airport | null): boolean {
  return Boolean(planRoute(plan, airport) && plan.flightDate && plan.flightTime && (!plan.toAirport || plan.pickup));
}

/** The listing instant: pickup (to the airport) or arrival (from it). */
export function planTime(plan: AirportPlan): string {
  return listingTime({
    toAirport: Boolean(plan.toAirport),
    flightDate: plan.flightDate,
    flightTime: plan.flightTime,
    pickup: plan.pickup,
  });
}

/** Query string that prefills the create form (route + day/time + flight). */
export function planCreateQs(plan: AirportPlan, airport: Airport | null): string {
  const qs = new URLSearchParams();
  const route = planRoute(plan, airport);
  if (!route) return "";
  setRouteParams(qs, route.from, route.to);
  const when = plan.toAirport && plan.pickup ? plan.pickup : { date: plan.flightDate, time: plan.flightTime };
  if (when.date && when.time) {
    qs.set("date", when.date);
    qs.set("time", when.time);
  }
  if (plan.flightNumber.trim()) qs.set("flight", plan.flightNumber.trim().toUpperCase());
  return qs.toString();
}
