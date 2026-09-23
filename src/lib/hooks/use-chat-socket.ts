"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket/client";
import type { ChatMessage } from "@/lib/api/chat";

interface UseChatSocketOptions {
  bookingId: string;
  onHistory?: (messages: ChatMessage[]) => void;
  // clientMsgId is present when the message originated from this client (same as client_msg_id in payload)
  onMessage?: (msg: ChatMessage, clientMsgId?: string) => void;
  onAck?: (clientMsgId: string, serverId: string) => void;
  onTyping?: (userId: string) => void;
  onRead?: (messageId: string, readAt: string) => void;
  onError?: (code: string) => void;
  onLimitWarning?: (remaining: number) => void;
}

export interface ChatSocketApi {
  connected: boolean;
  send: (text: string, clientMsgId: string) => void;
  markRead: (messageId: string) => void;
  sendTyping: () => void;
}

export function useChatSocket({
  bookingId,
  onHistory,
  onMessage,
  onAck,
  onTyping,
  onRead,
  onError,
  onLimitWarning,
}: UseChatSocketOptions): ChatSocketApi {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("chat:join", { booking_id: bookingId });
    };
    const onDisconnect = () => setConnected(false);
    const onJoined = (data: { booking_id: string; history: ChatMessage[] }) => {
      if (data.booking_id === bookingId) onHistory?.(data.history);
    };
    const onMsg = (data: { message: ChatMessage; client_msg_id?: string | null } | ChatMessage) => {
      const m = "message" in data ? data.message : data;
      const cid = "client_msg_id" in data && data.client_msg_id ? data.client_msg_id : undefined;
      onMessage?.(m, cid);
    };
    const onAckEvent = (data: { client_msg_id: string; server_id: string }) => {
      onAck?.(data.client_msg_id, data.server_id);
    };
    const onTypingEvent = (data: { user_id: string }) => onTyping?.(data.user_id);
    const onReadEvent = (data: { message_id: string; read_at: string }) =>
      onRead?.(data.message_id, data.read_at);
    const onErrorEvent = (data: { code: string }) => onError?.(data.code);
    const onLimitWarningEvent = (data: { remaining: number }) => onLimitWarning?.(data.remaining);

    // Re-join the booking room on EVERY (re)connect. `once` dropped the user
    // out of the room after any disconnect (tunnel restart, background tab):
    // chat looked alive but received no messages/read-ticks until remount.
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    socket.on("disconnect", onDisconnect);
    socket.on("chat:joined", onJoined);
    socket.on("chat:message", onMsg);
    socket.on("chat:message_sent", onAckEvent);
    socket.on("chat:typing", onTypingEvent);
    socket.on("chat:read", onReadEvent);
    socket.on("chat:error", onErrorEvent);
    socket.on("chat:limit_warning", onLimitWarningEvent);

    return () => {
      socket.emit("chat:leave", { booking_id: bookingId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:joined", onJoined);
      socket.off("chat:message", onMsg);
      socket.off("chat:message_sent", onAckEvent);
      socket.off("chat:typing", onTypingEvent);
      socket.off("chat:read", onReadEvent);
      socket.off("chat:error", onErrorEvent);
      socket.off("chat:limit_warning", onLimitWarningEvent);
    };
  }, [bookingId, onHistory, onMessage, onAck, onTyping, onRead, onError, onLimitWarning]);

  return {
    connected,
    send: (text, clientMsgId) => {
      socketRef.current?.emit("chat:send", { booking_id: bookingId, text, client_msg_id: clientMsgId });
    },
    markRead: (messageId) => {
      socketRef.current?.emit("chat:read", { message_id: messageId });
    },
    sendTyping: () => {
      socketRef.current?.emit("chat:typing", { booking_id: bookingId });
    },
  };
}
