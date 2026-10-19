"use client";

import { Send } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

interface Props {
  onSend: (text: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  className?: string;
}

const MAX = 2000;

export function MessageComposer({ onSend, onTyping, disabled, className }: Props) {
  const t = useTranslations("chat");
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to max-h-28 (~4 lines), then the textarea scrolls internally.
  const autoGrow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.focus();
    });
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        // border/bg/safe-area live on the parent composer zone (chat-messages)
        "flex items-end gap-2 p-3",
        className,
      )}
    >
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value.slice(0, MAX));
          autoGrow();
          onTyping?.();
        }}
        onKeyDown={handleKey}
        placeholder={t("placeholder")}
        rows={1}
        disabled={disabled}
        className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl bg-ink-100 px-4 py-2.5 text-[15px] font-600 text-ink-900 outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500 disabled:opacity-50 dark:bg-ink-800 dark:text-white"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        aria-label={t("send_aria")}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent-500 text-accent-ink hover:bg-accent-400 disabled:opacity-40"
      >
        <Send className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
}
