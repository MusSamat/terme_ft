import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { ChartCard } from "./chart-card";

const FUNNEL_LABELS: Record<string, string> = {
  started: "Зарегистрировались",
  phone_verified: "Верификация телефона",
  name_filled: "Заполнили имя",
  first_action: "Первое действие",
  day_1_retention: "День 1 retention",
  second_booking: "2+ бронирований",
};

interface Props {
  data: Array<{ stage: string; count: number }>;
  loading: boolean;
}

export function FunnelChart({ data, loading }: Props) {
  const funnelData = data.map((r) => ({ ...r, label: FUNNEL_LABELS[r.stage] ?? r.stage }));

  return (
    <ChartCard title="Воронка онбординга" loading={loading}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={funnelData}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={150} />
          <Tooltip formatter={((v: unknown) => [v, "Пользователей"]) as unknown as undefined} />
          <Bar dataKey="count" fill="#0D9488" radius={[0, 4, 4, 0]}>
            {funnelData.map((_, i) => (
              <Cell key={i} fill={`hsl(175, 84%, ${32 + i * 7}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
