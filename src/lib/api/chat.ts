import { api } from "./client";
import type { components } from "./schema.gen";

export type ChatMessage = components["schemas"]["ChatMessage"];

export async function getChatHistory(
  bookingId: string,
  cursor?: string,
  limit = 50,
): Promise<{ data: ChatMessage[]; nextCursor: string | null }> {
  const { data } = await api.get<{ data: ChatMessage[]; nextCursor: string | null }>(
    `/chats/${bookingId}/messages`,
    { params: { cursor, limit } },
  );
  return data;
}

export async function sendMessageRest(
  bookingId: string,
  text: string,
  clientMsgId?: string,
): Promise<ChatMessage> {
  // The backend returns { message: ChatMessage, clientMsgId? } — unwrap the message.
  const { data } = await api.post<{ message: ChatMessage }>(`/chats/${bookingId}/messages`, {
    text,
    ...(clientMsgId ? { clientMsgId } : {}),
  });
  return data.message;
}

export async function markMessageRead(messageId: string): Promise<ChatMessage> {
  const { data } = await api.patch<ChatMessage>(`/messages/${messageId}/read`);
  return data;
}

export async function getChatUnreadCounts(): Promise<Record<string, number>> {
  const { data } = await api.get<{ counts: Record<string, number> }>("/chats/unread-counts");
  return data.counts;
}

export interface ChatSummary {
  bookingId: string;
  bookingStatus: string;
  role: "passenger" | "driver";
  otherName: string;
  otherAvatarUrl: string | null;
  route: string;
  lastMessageAt: string | null;
  /** Preview line — text of the most recent message (null until first message). */
  lastMessage: string | null;
  unreadCount: number;
}

export async function markAllChatRead(bookingId: string): Promise<void> {
  await api.patch(`/chats/${bookingId}/read-all`);
}

export async function getChatSummaries(): Promise<ChatSummary[]> {
  const { data } = await api.get<{ chats: ChatSummary[] }>("/chats/summaries");
  return data.chats;
}
