// Formatting helpers local to the WhatsApp inbox.

/** "996773053701" → "+996 773 053 701". Falls back to a plain "+<digits>". */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("996")) {
    const [, cc, a, b, c] = digits.match(/^(996)(\d{3})(\d{3})(\d{3})$/) ?? [];
    if (cc) return `+${cc} ${a} ${b} ${c}`;
  }
  return `+${digits}`;
}

/** Bubble timestamp — HH:MM. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** Conversation-list timestamp — HH:MM today, else a short date. */
export function formatListTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
