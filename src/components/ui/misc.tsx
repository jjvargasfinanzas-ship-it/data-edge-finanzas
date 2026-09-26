import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "./cn";
import { formatMoney, formatPct, type Currency } from "@/lib/money";

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...p}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 animate-fade-up sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-xl leading-tight font-semibold text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted sm:text-[13px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = "neutral" | "positive" | "negative" | "warning" | "brand" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-tint-2 text-ink-2 border-transparent",
  positive: "bg-positive-50 text-positive border-transparent",
  negative: "bg-negative-50 text-negative border-transparent",
  warning: "bg-warning-50 text-warning border-transparent",
  brand: "bg-tint text-teal-700 border-transparent",
  dark: "bg-navy-700/10 text-navy-700 border-transparent",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-px text-[10.5px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Money({
  value,
  currency = "COP",
  className,
  signed,
  compact,
  colored,
}: {
  value: number;
  currency?: Currency;
  className?: string;
  signed?: boolean;
  compact?: boolean;
  colored?: boolean;
}) {
  return (
    <span
      className={cn(
        "num",
        colored && value > 0 && "text-positive",
        colored && value < 0 && "text-negative",
        className,
      )}
    >
      {formatMoney(value, currency, { signed, compact })}
    </span>
  );
}

/** Variación vs periodo anterior. `goodWhen` define si subir es bueno. */
export function Delta({ value, goodWhen = "up", className }: { value: number | null; goodWhen?: "up" | "down"; className?: string }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={cn("text-xs font-semibold text-muted", className)}>Sin comparativo</span>;
  }
  const flat = Math.abs(value) < 0.05;
  const good = flat ? null : goodWhen === "up" ? value > 0 : value < 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold num",
        good === null && "bg-tint-2 text-muted",
        good === true && "bg-positive-50 text-positive",
        good === false && "bg-negative-50 text-negative",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {formatPct(value, { signed: true })}
    </span>
  );
}

export function Progress({ value, tone = "brand", className, label }: { value: number; tone?: "brand" | "warning" | "negative"; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-tint-2", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "brand" && "bg-teal-400",
          tone === "warning" && "bg-warning/70",
          tone === "negative" && "bg-negative/70",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-tint text-teal-600">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}
