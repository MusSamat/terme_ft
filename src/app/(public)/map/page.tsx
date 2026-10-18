import type { Metadata } from "next";
import { Suspense } from "react";
import { MapScreen } from "@/components/features/map/map-screen";

export const metadata: Metadata = {
  title: "Карта поездок",
  description: "Поездки и попутчики на карте Кыргызстана — выберите ближайшего водителя.",
};

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapScreen />
    </Suspense>
  );
}
