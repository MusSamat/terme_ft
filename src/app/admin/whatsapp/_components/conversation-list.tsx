"use client";

import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui";
import { MessageCircle } from "lucide-react";
import type { WhatsappConversationItem } from "@/lib/api/admin";
import { formatPhone, formatListTime } from "../_lib/format";

interface Props {
  conversations: WhatsappConversationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ConversationList({ conversations, selectedId, onSelect, isLoading }: Props) {
  return (
    <aside className="flex min-h-0 w-80 flex-shrink-0 flex-col border-r border-ink-200 bg-white">
      <header className="flex items-center gap-2 border-b border-ink-200 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-[15px] font-disp font-extrabold leading-tight text-ink-900">
            WhatsApp
          </h1>
          <p className="text-[12px] text-ink-500">
            {conversations.length > 0 ? `${conversations.length} диалогов` : "Входящие сообщения"}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center py-10">
            <Spinner />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <MessageCircle className="h-8 w-8 text-ink-300" />
            <p className="text-[13px] text-ink-500">Пока нет диалогов</p>
          </div>
        ) : (
          <ul>
            {conversations.map((c) => {
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                      active
                        ? "border-brand-600 bg-brand-50"
                        : "border-transparent hover:bg-ink-50",
                    )}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-extrabold text-brand-700">
                      {c.phoneNumber.replace(/\D/g, "").slice(-2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-bold text-ink-900">
                          {formatPhone(c.phoneNumber)}
                        </span>
                        <span className="flex-shrink-0 text-[11px] text-ink-400">
                          {formatListTime(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-ink-500">
                        {c.lastMessagePreview ?? "—"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
