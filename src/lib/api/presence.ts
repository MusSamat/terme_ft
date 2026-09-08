import { api } from "./client";

/** Authenticated heartbeat — bumps last_seen_at + last_platform on the server. */
export async function pingPresence(): Promise<void> {
  await api.post("/presence/ping");
}

/** Public online counter (server-cached ~10s). */
export async function getOnline(): Promise<number> {
  const { data } = await api.get<{ online: number }>("/presence/online");
  return data.online;
}
