"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { Button, Spinner } from "@/components/ui";
import { Check, CheckCheck, AlertTriangle, Send, MessageSquare, X } from "lucide-react";
import type { WhatsappConversationItem, WhatsappMessageItem } from "@/lib/api/admin";
import { formatPhone, formatTime } from "../_lib/format";

interface ReplyError {
  code: string;
  message: string;
}

interface Props {
  conversation: WhatsappConversationItem | null;
  messages: WhatsappMessageItem[];
  isLoading: boolean;
  sending: boolean;
  replyError: ReplyError | null;
  onSend: (text: string) => void;
  onClearError: () => void;
}

function OutboundStatus({ status }: { status: WhatsappMessageItem["status"] }) {
  if (status === "FAILED")
    return (
      <span className="flex items-center gap-0.5 text-coral-200">
        <AlertTriangle className="h-3 w-3" /> не доставлено
      </span>
    );
  if (status === "READ") return <CheckCheck className="h-3.5 w-3.5 text-sky-200" />;
  if (status === "DELIVERED") return <CheckCheck className="h-3.5 w-3.5 text-brand-100/80" />;
  return <Check className="h-3.5 w-3.5 text-brand-100/70" />; // SENT / null
}

export function MessageThread({
  conversation,
  messages,
  isLoading,
  sending,
  replyError,
  onSend,
  onClearError,
}: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Whether the reader is pinned to the newest message. Flipped false as soon as
  // they scroll up to read history, so 10s polling doesn't yank them back down.
  const stickToBottom = useRef(true);

  function onThreadScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // New/updated messages: only follow to the bottom if the reader was already there.
  useEffect(() => {
    if (stickToBottom.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages.length]);

  // Switching conversation: always jump to the bottom and re-arm sticky follow.
  useEffect(() => {
    stickToBottom.current = true;
    scrollRef.current?.scrollTo({ top: scrollRef.current?.scrollHeight ?? 0 });
    if (conversation) inputRef.current?.focus();
  }, [conversation?.id]);

  if (!conversation) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-ink-100 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-300 shadow-card">
          <MessageSquare className="h-7 w-7" />
        </div>
        <p className="text-[14px] font-bold text-ink-700">Выберите диалог</p>
        <p className="max-w-xs text-[13px] text-ink-500">
          Выберите беседу слева, чтобы прочитать переписку и ответить клиенту.
        </p>
      </section>
    );
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    stickToBottom.current = true; // always follow our own outgoing message
    onSend(trimmed);
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Ignore Enter mid-IME-composition (Cyrillic/other) so it doesn't send early.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  function onInput(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-ink-100">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-ink-200 bg-white px-5 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-[12px] font-extrabold text-brand-700">
          {conversation.phoneNumber.replace(/\D/g, "").slice(-2)}
        </div>
        <div>
          <p className="text-[14px] font-bold text-ink-900">
            {formatPhone(conversation.phoneNumber)}
          </p>
          <p className="text-[12px] text-ink-500">WhatsApp</p>
        </div>
      </header>

      {/* Thread */}
      <div
        ref={scrollRef}
        onScroll={onThreadScroll}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-ink-400">Нет сообщений</p>
          </div>
        ) : (
          messages.map((m) => {
            const outbound = m.direction === "OUTBOUND";
            return (
              <div
                key={m.id}
                className={cn("flex", outbound ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[72%] rounded-2xl px-3.5 py-2 shadow-xs",
                    outbound
                      ? "rounded-br-md bg-brand-600 text-white"
                      : "rounded-bl-md border border-ink-200 bg-white text-ink-900",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">
                    {m.body}
                  </p>
                  <div
                    className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-[10px]",
                      outbound ? "text-brand-100/90" : "text-ink-400",
                    )}
                  >
                    <span>{formatTime(m.createdAt)}</span>
                    {outbound && <OutboundStatus status={m.status} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-ink-200 bg-white px-4 py-3">
        {replyError && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-[12px] text-danger-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">{replyError.message}</p>
              {replyError.code === "WHATSAPP_WINDOW_EXPIRED" && (
                <p className="mt-0.5 text-danger-600">
                  Свободный ответ доступен только в течение 24 часов после последнего сообщения
                  клиента. Отправьте шаблонное сообщение (template), чтобы возобновить диалог.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClearError}
              className="text-danger-400 hover:text-danger-700"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={onInput}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Напишите сообщение…"
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <Button
            variant="brand"
            size="md"
            onClick={submit}
            disabled={sending || text.trim().length === 0}
            className="flex-shrink-0"
          >
            {sending ? <Spinner /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </section>
  );
}
