import { CreateScreen } from "@/components/features/create/create-screen";
import { routeFromParams } from "@/lib/places";

interface Props {
  searchParams: Record<string, string | undefined>;
}

// ?from_id=…&from=…&to_id=…&to=… prefills the route (only id-backed places —
// a name-only link can't publish, the user picks it from the directory).
export default function CreateTripPage({ searchParams }: Props) {
  const { from, to } = routeFromParams((k) => searchParams[k] ?? null);
  return (
    <CreateScreen
      intent="driver"
      initialFrom={from?.id != null ? from : null}
      initialTo={to?.id != null ? to : null}
    />
  );
}
