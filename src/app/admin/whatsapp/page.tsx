"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listWhatsappConversations,
  getWhatsappMessages,
  sendWhatsappReply,
  type WhatsappMessageItem,
} from "@/lib/api/admin";
import { extractError } from "@/lib/api/client";
import { toastError } from "@/components/layout/quick-toast";
import { ConversationList } from "./_components/conversation-list";
import { MessageThread } from "./_components/message-thread";

const CONVERSATIONS_KEY = ["admin", "whatsapp", "conversations"] as const;
const messagesKey = (id: string) => ["admin", "whatsapp", "messages", id] as const;

interface ReplyError {
  code: string;
  message: string;
}

export default function AdminWhatsappPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<ReplyError | null>(null);

  // Left panel — refreshed every 10s so new inbound conversations surface.
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: listWhatsappConversations,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  // Auto-select the first conversation once the list arrives.
  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0]!.id);
  }, [conversations, selectedId]);

  // Clear any stale composer error when switching conversations.
  useEffect(() => {
    setReplyError(null);
  }, [selectedId]);

  // Right panel — the open thread, also polled so incoming replies appear.
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: selectedId ? messagesKey(selectedId) : ["admin", "whatsapp", "messages", "none"],
    queryFn: () => getWhatsappMessages(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 10_000,
  });

  const replyMut = useMutation({
    mutationFn: (text: string) => sendWhatsappReply(selectedId!, text),
    onMutate: () => setReplyError(null),
    onSuccess: (created: WhatsappMessageItem) => {
      // Snappy append, then reconcile list order/preview + delivery status.
      qc.setQueryData<WhatsappMessageItem[]>(messagesKey(created.conversationId), (old) =>
        old ? [...old, created] : [created],
      );
      void qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      void qc.invalidateQueries({ queryKey: messagesKey(created.conversationId) });
    },
    onError: (err) => {
      const e = extractError(err);
      const code = e?.code ?? "INTERNAL_ERROR";
      const message = e?.message ?? "Не удалось отправить сообщение";
      // The 24h-window case is shown inline in the composer; everything else
      // is a transient failure → toast.
      if (code === "WHATSAPP_WINDOW_EXPIRED") setReplyError({ code, message });
      else {
        setReplyError({ code, message });
        toastError(message);
      }
    },
  });

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-ink-100">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        isLoading={loadingConversations}
      />
      <MessageThread
        conversation={selected}
        messages={messages}
        isLoading={loadingMessages}
        sending={replyMut.isPending}
        replyError={replyError}
        onSend={(text) => replyMut.mutate(text)}
        onClearError={() => setReplyError(null)}
      />
    </div>
  );
}
