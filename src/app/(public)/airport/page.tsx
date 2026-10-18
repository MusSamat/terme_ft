import type { Metadata } from "next";
import { AirportScreen } from "@/components/features/airport/airport-screen";

export const metadata: Metadata = {
  title: "Трансфер в аэропорт",
  description: "Бишкек ↔ аэропорт «Манас», Ош ↔ аэропорт Ош: водители и попутчики на ваш рейс.",
};

export default function AirportPage() {
  return <AirportScreen />;
}
