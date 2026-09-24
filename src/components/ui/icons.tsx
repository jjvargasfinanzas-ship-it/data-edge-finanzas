import {
  Briefcase, Building, Car, CircleDashed, CirclePlus, FileSignature, Gift, GraduationCap, HeartPulse, House,
  Landmark, Percent, Plane, Plug, Popcorn, Receipt, Repeat, Shield, ShoppingBag, Store, TrendingUp, Users, Utensils,
  Wallet, CreditCard, Banknote, Smartphone, PiggyBank, ChartLine, Tags, type LucideIcon,
} from "lucide-react";
import type { AccountType } from "@/lib/constants";
import { cn } from "./cn";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  home: House, utensils: Utensils, car: Car, "heart-pulse": HeartPulse, "graduation-cap": GraduationCap, plug: Plug,
  popcorn: Popcorn, plane: Plane, users: Users, "shopping-bag": ShoppingBag, repeat: Repeat, landmark: Landmark,
  receipt: Receipt, shield: Shield, "circle-dashed": CircleDashed, briefcase: Briefcase, "file-signature": FileSignature,
  store: Store, percent: Percent, building: Building, "trending-up": TrendingUp, gift: Gift, "circle-plus": CirclePlus,
};

export function CategoryIcon({ icon, color, className, size = "md" }: { icon?: string | null; color?: string | null; className?: string; size?: "sm" | "md" }) {
  const I = (icon && CATEGORY_ICONS[icon]) || Tags;
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xl", size === "md" ? "size-10" : "size-8", className)}
      style={{ backgroundColor: `${color ?? "#64748B"}1A`, color: color ?? "#64748B" }}
      aria-hidden
    >
      <I className={size === "md" ? "size-[18px]" : "size-4"} strokeWidth={2.2} />
    </span>
  );
}

const ACCOUNT_ICONS: Record<AccountType, LucideIcon> = {
  bank_savings: PiggyBank,
  bank_checking: Landmark,
  cash: Banknote,
  digital_wallet: Smartphone,
  investment: ChartLine,
  credit_card: CreditCard,
  other: Wallet,
};

export function AccountIcon({ type, className }: { type: AccountType; className?: string }) {
  const I = ACCOUNT_ICONS[type];
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900/5 text-navy-700", className)} aria-hidden>
      <I className="size-[18px]" strokeWidth={2.2} />
    </span>
  );
}
