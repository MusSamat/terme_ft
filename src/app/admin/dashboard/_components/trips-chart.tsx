import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { ChartCard } from "./chart-card";

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

type TripPoint = { date: string; active: number; completed: number; cancelled: number };

interface Props {
  data: TripPoint[];
  loading: boolean;
  days: number;
}

export function TripsChart({ data, loading, days }: Props) {
  return (
    <ChartCard title={`Поездки за ${days} дней`} loading={loading}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
          <XAxis dataKey="date" tickFormatter={fmtShortDate} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip labelFormatter={fmtShortDate as unknown as undefined} />
          <Area type="monotone" dataKey="completed" stackId="1" stroke="#78716C" fill="#E7E5E4" strokeWidth={2} name="Завершены" />
          <Area type="monotone" dataKey="active" stackId="1" stroke="#0D9488" fill="#D0FBEF" strokeWidth={2} name="Активны" />
          <Area type="monotone" dataKey="cancelled" stackId="1" stroke="#EF4444" fill="#FEE2E2" strokeWidth={2} name="Отменены" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
