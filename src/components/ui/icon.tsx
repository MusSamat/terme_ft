import {
  Search,
  Ticket,
  Plus,
  Bell,
  User,
  CarFront,
  Hand,
  MapPin,
  Flag,
  ArrowDownUp,
  Calendar,
  Clock,
  Users,
  Wallet,
  Briefcase,
  ShieldCheck,
  Star,
  Heart,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Info,
  Route,
  LogIn,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Единый словарь иконок (design-system §10): одна иконка = один смысл во всём
 * приложении. Всегда импортируй иконки отсюда, а не из lucide-react напрямую,
 * чтобы значение оставалось единым.
 */
export const ICON = {
  // Навигация
  search: Search,
  myItems: Ticket,
  create: Plus,
  notifications: Bell,
  profile: User,
  // Тип объявления
  trip: CarFront,
  request: Hand,
  from: MapPin,
  to: Flag,
  swap: ArrowDownUp,
  // Детали поездки
  date: Calendar,
  time: Clock,
  seats: Users,
  price: Wallet,
  luggage: Briefcase,
  // Доверие и действия
  verified: ShieldCheck,
  rating: Star,
  like: Heart,
  chat: MessageCircle,
  done: CheckCircle,
  // Состояния / обратная связь
  error: AlertCircle,
  info: Info,
  route: Route,
  login: LogIn,
  next: ArrowRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON;

const TONE = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-100 text-accent-600",
  ink: "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300",
} as const;

export type IconTone = keyof typeof TONE;

const BOX = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-16 w-16 rounded-2xl",
} as const;

const GLYPH = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

interface IconBadgeProps {
  name: IconName;
  tone?: IconTone;
  size?: keyof typeof BOX;
  className?: string;
}

/** Иконка в мягком плитке-бейдже — канонический вид из словаря §10. */
export function IconBadge({ name, tone = "brand", size = "md", className }: IconBadgeProps) {
  const Glyph = ICON[name];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", BOX[size], TONE[tone], className)}>
      <Glyph className={GLYPH[size]} aria-hidden="true" />
    </span>
  );
}
