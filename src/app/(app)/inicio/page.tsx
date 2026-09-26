import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Circle, TriangleAlert } from "lucide-react";
import { CategoryBars, type CategoryRow } from "@/components/charts/category-bars";
import { NewAccountButton, NewPlannedButton, NewTransactionButton } from "@/components/app/open-buttons";
import { PendingList } from "@/components/app/pending-list";
import { PositionsSummary, type PositionTile } from "@/components/app/positions-summary";
import { Badge, Card, EmptyState, Progress } from "@/components/ui/misc";
import { AccountIcon } from "@/components/ui/icons";
import { StatRows } from "@/components/ui/stat-rows";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCashflow, getCategories, getContext, getMonthTotals, getRates } from "@/lib/data";
import { addDays, diffDays, endOfMonth, formatLong, formatMonth, formatShort, hourInTz, startOfMonth } from "@/lib/dates";
import { convert, formatMoney, formatPct } from "@/lib/money";
import { isLiquid } from "@/lib/cashflow";
import { nextDayOfMonth } from "@/lib/recurrence";

export const metadata: Metadata = { title: "Inicio" };

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function SectionTitle({ title, badge, action }: { title: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {title} {badge}
      </h2>
      {action}
    </div>
  );
}

export default async function InicioPage() {
  const { profile, today, tz, currency, supabase } = await getContext();
  const monthFrom = startOfMonth(today);
  const eom = endOfMonth(today);

  const [accounts, categories, rates, totals, flow, txCount] = await Promise.all([
    getAccounts(),
    getCategories(),
    getRates(),
    getMonthTotals(monthFrom, today),
    getCashflow(eom > addDays(today, 7) ? eom : addDays(today, 7)),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);

  const active = accounts.filter((a) => !a.is_archived);
  const toBase = (v: number, c: (typeof accounts)[number]["currency"]) => convert(v, c, currency, rates);
  const liquid = active.filter((a) => isLiquid(a.type));
  const cards = active.filter((a) => a.type === "credit_card");
  const cardDebt = cards.reduce((s, a) => s + toBase(Math.max(0, -a.balance), a.currency), 0);
  const owedToMe = active.filter((a) => a.type === "loan_receivable").reduce((s, a) => s + toBase(Math.max(0, a.balance), a.currency), 0);
  const iOwe = active.filter((a) => a.type === "loan_payable").reduce((s, a) => s + toBase(Math.max(0, -a.balance), a.currency), 0);

  // Posiciones financieras (moneda base)
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const byTypes = (types: string[]) => active.filter((a) => types.includes(a.type));
  const sumBase = (list: typeof active) => list.reduce((s, a) => s + toBase(a.balance, a.currency), 0);
  const savings = byTypes(["bank_savings"]);
  const wallets = byTypes(["digital_wallet"]);
  const investments = byTypes(["investment"]);
  const cardLimit = cards.reduce((s, a) => s + toBase(a.credit_limit ?? 0, a.currency), 0);
  const cardAvailable = cards.reduce((s, a) => s + toBase(Math.max(0, (a.credit_limit ?? 0) - Math.max(0, -a.balance)), a.currency), 0);
  const tile = (key: PositionTile["key"], label: string, list: typeof active, href: string): PositionTile => ({
    key,
    label,
    value: sumBase(list),
    hint: list.length ? count(list.length, "cuenta", "cuentas") : "Agregar",
    href,
    empty: !list.length,
  });
  const positions: PositionTile[] = [
    tile("ahorros", "Cuentas de ahorro", savings, "/cuentas?tipo=ahorros"),
    tile("billeteras", "Billeteras digitales", wallets, "/cuentas?tipo=billeteras"),
    tile("inversiones", "Inversiones", investments, "/cuentas?tipo=inversiones"),
    {
      key: "tarjetas",
      label: "Disponible en tarjetas",
      value: cardAvailable,
      hint: cards.length ? `de ${formatMoney(cardLimit, currency, { compact: true })} de cupo` : "Agregar",
      href: "/tarjetas",
      empty: !cards.length,
    },
  ];

  // Por confirmar: lo programado cuya fecha ya llegó
  const visible = flow.occurrences.filter((o) => !(o.flow === "transfer" && o.cashEffect === 0));
  const toConfirm = visible.filter((o) => o.dueDate <= today && o.flow !== "card_estimate");
  const next7 = visible.filter((o) => (o.dueDate > today || o.flow === "card_estimate") && o.date <= addDays(today, 7));

  // Proyección al cierre del mes
  const monthOcc = flow.occurrences.filter((o) => o.date <= eom);
  const toReceive = monthOcc.reduce((s, o) => s + Math.max(0, o.cashEffect), 0);
  const toPay = monthOcc.reduce((s, o) => s + Math.max(0, -o.cashEffect), 0);
  const monthDays = flow.days.filter((d) => d.date <= eom);
  const projected = monthDays[monthDays.length - 1]?.closing ?? flow.startBalance;
  const low = monthDays.reduce((m, d) => (d.closing < m.closing ? d : m), monthDays[0] ?? { closing: flow.startBalance, date: today });

  // Gastos reales por categoría
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const byParent = new Map<string, CategoryRow>();
  for (const [catId, value] of totals.byCategory) {
    const c = catId ? catMap.get(catId) : undefined;
    const parent = c?.parent_id ? catMap.get(c.parent_id) : c;
    const key = parent?.id ?? "none";
    const row = byParent.get(key) ?? { id: key, name: parent?.name ?? "Sin categoría", icon: parent?.icon ?? null, color: parent?.color ?? null, value: 0 };
    row.value += value;
    byParent.set(key, row);
  }
  const catRows = [...byParent.values()].sort((a, b) => b.value - a.value).slice(0, 5);

  const hasPlanned = flow.occurrences.some((o) => o.plannedItemId);
  const steps = [
    { done: active.length > 1, label: "Agrega tus cuentas", action: <NewAccountButton variant="secondary" size="sm">Cuenta</NewAccountButton> },
    { done: hasPlanned, label: "Programa ingresos y pagos fijos", action: <NewPlannedButton variant="secondary" size="sm" initial={{ kind: "income" }}>Programar</NewPlannedButton> },
    { done: (txCount.count ?? 0) > 0, label: "Registra tu primer movimiento", action: <NewTransactionButton variant="secondary" size="sm" initial={{ kind: "expense" }}>Registrar</NewTransactionButton> },
  ];
  const showSteps = steps.some((s) => !s.done);
  const monthName = formatMonth(today).split(" ")[0];

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-medium text-muted first-letter:uppercase">{formatLong(today)}</p>
        <h1 className="font-display text-xl leading-tight font-semibold text-ink sm:text-2xl">
          {greeting(hourInTz(tz))}, {profile.first_name || "hola"}.
        </h1>
      </header>

      {showSteps && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-ink">Completa tu espacio financiero</p>
          <ul className="mt-3 space-y-2">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                {s.done ? <CheckCircle2 className="size-5 shrink-0 text-positive" /> : <Circle className="size-5 shrink-0 text-line-strong" />}
                <span className={cn("flex-1 text-sm", s.done ? "text-muted line-through" : "font-semibold text-ink")}>{s.label}</span>
                {!s.done && s.action}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PositionsSummary tiles={positions} currency={currency} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* ───── Columna REAL ───── */}
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="px-4 pt-4 sm:px-5">
              <p className="flex items-center gap-2 text-xs font-medium text-muted">
                Saldo real disponible <Badge tone="positive">Real</Badge>
              </p>
              <p className={cn("num mt-1 text-2xl leading-tight font-semibold", flow.startBalance < 0 ? "text-negative" : "text-ink")}>
                {formatMoney(flow.startBalance, currency)}
              </p>
              <p className="mt-0.5 text-xs text-muted">Lo que hay hoy en tus cuentas, con los movimientos ya confirmados. Toca una cuenta para ver de dónde sale.</p>
            </div>
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {liquid.map((a) => (
                <li key={a.id}>
                  <Link href={`/cuentas/${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-tint/70 sm:px-5">
                    <AccountIcon type={a.type} className="size-8 rounded-lg [&_svg]:size-4" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{a.name}</span>
                    <span className={cn("num shrink-0 text-sm font-semibold", a.balance < 0 ? "text-negative" : "text-ink")}>{formatMoney(a.balance, a.currency)}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
              {cards.length > 0 && (
                <li>
                  <Link href="/tarjetas" className="flex items-center gap-3 px-4 py-2.5 text-muted hover:bg-tint/70 sm:px-5">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">Deuda en tarjetas (no se resta del disponible)</span>
                    <span className="num shrink-0 text-xs font-semibold">{formatMoney(cardDebt, currency)}</span>
                    <ChevronRight className="size-4 shrink-0" />
                  </Link>
                </li>
              )}
              {(owedToMe > 0 || iOwe > 0) && (
                <li>
                  <Link href="/prestamos" className="flex items-center gap-3 px-4 py-2.5 text-muted hover:bg-tint/70 sm:px-5">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {owedToMe > 0 && iOwe > 0 ? "Préstamos: me deben / debo" : owedToMe > 0 ? "Préstamos que me deben (no suman al disponible)" : "Préstamos que debo (no se restan del disponible)"}
                    </span>
                    <span className="num shrink-0 text-xs font-semibold">
                      {owedToMe > 0 && <span className="text-positive">{formatMoney(owedToMe, currency)}</span>}
                      {owedToMe > 0 && iOwe > 0 && " / "}
                      {iOwe > 0 && formatMoney(iOwe, currency)}
                    </span>
                    <ChevronRight className="size-4 shrink-0" />
                  </Link>
                </li>
              )}
            </ul>
          </Card>

          {toConfirm.length > 0 && (
            <Card className="border-warning/30">
              <SectionTitle title="Por confirmar" badge={<Badge tone="warning">{toConfirm.length}</Badge>} />
              <p className="px-4 text-xs text-muted sm:px-5">Programados cuya fecha ya llegó. Confírmalos para que pasen a tu saldo real.</p>
              <div className="px-4 pb-1 sm:px-5">
                <PendingList items={toConfirm.slice(0, 4)} baseCurrency={currency} group="none" />
              </div>
              {toConfirm.length > 4 && (
                <Link href="/flujo-de-caja?v=proyectado" className="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-teal-700 hover:bg-canvas sm:px-5">
                  Ver los {toConfirm.length} por confirmar
                </Link>
              )}
            </Card>
          )}

          <Card>
            <SectionTitle
              title={`${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} · real`}
              action={
                <Link href="/movimientos" className="shrink-0 text-xs font-semibold text-teal-700 hover:underline">
                  Movimientos
                </Link>
              }
            />
            <div className="px-4 pb-2 sm:px-5">
              <StatRows
                rows={[
                  { label: "Ingresos recibidos", value: formatMoney(totals.income, currency), tone: "in" },
                  { label: "Gastos pagados", value: formatMoney(totals.expense, currency), tone: "out" },
                  {
                    label: "Neto del mes",
                    value: formatMoney(totals.savings, currency, { signed: true }),
                    tone: totals.savings < 0 ? "negative" : "total",
                    hint: totals.income > 0 ? `Tasa de ahorro ${formatPct((totals.savings / totals.income) * 100, { digits: 0 })}` : undefined,
                  },
                ]}
              />
            </div>
          </Card>
        </div>

        {/* ───── Columna PROYECTADA ───── */}
        <div className="min-w-0 space-y-4">
          <Card>
            <SectionTitle
              title="Proyección del mes"
              badge={<Badge>Estimado</Badge>}
              action={
                <Link href="/flujo-de-caja?v=proyectado" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                  Flujo <ArrowRight className="size-4" />
                </Link>
              }
            />
            <p className="px-4 text-xs text-muted sm:px-5">Si todo lo programado ocurre. Puede cambiar.</p>
            <div className="px-4 pb-2 sm:px-5">
              <StatRows
                rows={[
                  { label: "Saldo real hoy", value: formatMoney(flow.startBalance, currency) },
                  { op: "+", label: "Por recibir", value: formatMoney(toReceive, currency), tone: "in" },
                  { op: "−", label: "Por pagar", hint: cards.length ? "Incluye pago estimado de tarjetas" : undefined, value: formatMoney(toPay, currency), tone: "out" },
                  {
                    op: "=",
                    label: `Saldo estimado al ${formatShort(eom)}`,
                    value: formatMoney(projected, currency),
                    tone: projected < 0 ? "negative" : "total",
                  },
                ]}
              />
            </div>
            {low && low.closing < 0 && (
              <p className="flex items-start gap-2 border-t border-line bg-negative-50 px-4 py-2.5 text-xs font-semibold text-negative sm:px-5">
                <TriangleAlert className="size-4 shrink-0" />
                El {formatShort(low.date)} tu saldo quedaría en {formatMoney(low.closing, currency)}.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle
              title="Próximos 7 días"
              action={
                <Link href="/calendario" className="shrink-0 text-xs font-semibold text-teal-700 hover:underline">
                  Calendario
                </Link>
              }
            />
            <div className="px-4 pb-1 sm:px-5">
              <PendingList
                items={next7}
                baseCurrency={currency}
                group="none"
                empty={
                  <EmptyState
                    icon={<CalendarDays className="size-6" />}
                    title={hasPlanned ? "Nada programado esta semana" : "Aún no tienes nada programado"}
                    description={hasPlanned ? undefined : "Programa tu salario, arriendo y pagos fijos para ver lo que viene."}
                    action={!hasPlanned ? <NewPlannedButton size="sm" initial={{ kind: "income" }}>Programar ingreso</NewPlannedButton> : undefined}
                    className="py-6"
                  />
                }
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle
            title="¿En qué se va tu dinero?"
            action={
              <Link href="/movimientos?tipo=expense" className="shrink-0 text-xs font-semibold text-teal-700 hover:underline">
                Ver gastos
              </Link>
            }
          />
          <div className="p-4 sm:p-5">
            {catRows.length ? (
              <CategoryBars rows={catRows} total={totals.expense} currency={currency} />
            ) : (
              <p className="text-sm text-muted">Aún no hay gastos registrados este mes.</p>
            )}
          </div>
        </Card>

        {cards.length > 0 && (
          <Card>
            <SectionTitle
              title="Tarjetas"
              action={
                <Link href="/tarjetas" className="shrink-0 text-xs font-semibold text-teal-700 hover:underline">
                  Ver
                </Link>
              }
            />
            <div className="space-y-4 p-4 sm:p-5">
              {cards.slice(0, 3).map((c) => {
                const used = Math.max(0, -c.balance);
                const pct = c.credit_limit ? (used / c.credit_limit) * 100 : 0;
                const due = c.due_day ? nextDayOfMonth(c.due_day, today) : null;
                const dueIn = due ? diffDays(due, today) : null;
                return (
                  <Link key={c.id} href={`/cuentas/${c.id}`} className="block">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-semibold text-ink">{c.name}</span>
                      <span className="num shrink-0 font-semibold">{formatMoney(used, c.currency)}</span>
                    </div>
                    <Progress value={pct} tone={pct >= 90 ? "negative" : pct >= 70 ? "warning" : "brand"} className="mt-2" label={`Uso de ${c.name}`} />
                    <p className="mt-1.5 flex items-center justify-between text-xs text-muted">
                      <span>{formatPct(pct, { digits: 0 })} del cupo</span>
                      {due && <span className={cn(dueIn !== null && dueIn <= 3 && used > 0 && "font-semibold text-warning")}>Pago {formatShort(due)}</span>}
                    </p>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
