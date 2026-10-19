"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

const STATUS_TABS = [
  { value: "active",    label: "Активные",     dot: "bg-brand-500" },
  { value: "completed", label: "Завершённые",   dot: "bg-ink-500" },
  { value: "cancelled", label: "Отменённые",    dot: "bg-ink-400" },
  { value: "all",       label: "Все",           dot: "bg-ink-300" },
] as const;

type StatusTab = typeof STATUS_TABS[number]["value"];

interface Props {
  status: StatusTab;
  fromInput: string;
  toInput: string;
  fromFilter: string;
  toFilter: string;
  onStatusChange: (s: StatusTab) => void;
  onFromInput: (v: string) => void;
  onToInput: (v: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onReset: () => void;
}

export function TripSearchBar({
  status,
  fromInput,
  toInput,
  fromFilter,
  toFilter,
  onStatusChange,
  onFromInput,
  onToInput,
  onSearch,
  onReset,
}: Props) {
  return (
    <>
      <div className="mb-4 flex gap-1 rounded-2xl bg-white p-1.5 shadow-soft w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onStatusChange(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors",
              status === tab.value
                ? "bg-ink-900 text-white"
                : "text-ink-500 hover:bg-ink-100 hover:text-ink-800",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full flex-shrink-0", tab.dot)} />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSearch} className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={fromInput}
            onChange={(e) => onFromInput(e.target.value)}
            placeholder="Откуда…"
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-[13px] outline-none focus:border-ink-400"
          />
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={toInput}
            onChange={(e) => onToInput(e.target.value)}
            placeholder="Куда…"
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-9 pr-4 text-[13px] outline-none focus:border-ink-400"
          />
        </div>
        <Button type="submit" variant="invert">
          Найти
        </Button>
        {(fromFilter || toFilter) && (
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
          >
            <X className="h-3.5 w-3.5" /> Сбросить
          </Button>
        )}
      </form>
    </>
  );
}
