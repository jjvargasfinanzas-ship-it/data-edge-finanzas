import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, CreditCard, ExternalLink, TriangleAlert, Waves } from "lucide-react";
import { BalanceChart } from "@/components/charts/balance-chart";
import { CategoryBars, type CategoryRow } from "@/components/charts/category-bars";
import { NewAccountButton, NewPlannedButton, NewTransactionButton } from "@/components/app/open-buttons";
import { UpcomingList } from "@/components/app/upcoming-list";
import { Badge, Card, CardHeader, Delta, EmptyState, Money, Progress } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCashflow, getCategories, getContext, getMonthTotals, getRates } from "@/lib/data";
import { addDays, addMonthsClamped, daysInMonth, diffDays, endOfMonth, formatLong, formatShort, fromISO, hourInTz, monthShort, startOfMonth } from "@/lib/dates";
import { convert, formatMoney, formatPct, pctChange } from "@/lib/money";
import { quoteForDate } from "@/lib/quotes";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { occurrencesBetween } from "@/lib/recurrence";
import { nextDayOfMonth } from "@/lib/recurrence";

export const metadata: Metadata = { title: "Inicio" };

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function InicioPage() {
  const { profile, today, tz, currency, supabase } = await getContext();

  // Mes actual hasta hoy vs. mismo corte del mes anterior
  const monthFrom = startOfMonth(today);
  const prevFrom = addMonthsClamped(monthFrom, -1);
  const prevDay = Math.min(fromISO(today).getUTCDate(), daysInMonth(fromISO(prevFrom).getUTCFullYear(), fromISO(prevFrom).getUTCMonth()));
  const prevTo = `${prevFrom.slice(0, 7)}-${String(prevDay).padStart(2, "0")}`;
  const horizon = addDays(today, 30);

  const [accounts, categories, rates, cur, prev, flow, eventsRes, txCount] = await Promise.all([
    getAccounts(),
    getCategories(),
    getRates(),
    getMonthTotals(monthFrom, today),
    getMonthTotals(prevFrom, prevTo),
    getCashflow(horizon < endOfMonth(today) ? endOfMonth(today) : horizon),
    supabase.from("calendar_events").select("*").lte("event_date", addDays(today, 14)),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);

  const active = accounts.filter((a) => !a.is_archived);
  const toBase = (v: number, c: (typeof accounts)[number]["currency"]) => convert(v, c, currency, rates);
  const netWorth = active.filter((a) => a.include_in_net_worth).reduce((s, a) => s + toBase(a.balance, a.currency), 0);
  const cards = active.filter((a) => a.type === "credit_card");
  const cardDebt = cards.reduce((s, a) => s + toBase(Math.max(0, -a.balance), a.currency), 0);

  const eom = flow.days.find((d) => d.date === endOfMonth(today))?.closing ?? flow.endBalance;
  const next30 = flow.days.slice(0, 31);
  const upcoming = flow.occurrences.filter((o) => o.date <= addDays(today, 14) && (o.cashEffect !== 0 || o.flow !== "transfer")).slice(0, 7);

  const savingsRate = cur.income > 0 ? (cur.savings / cur.income) * 100 : null;

  // Gastos por categoría principal
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const byParent = new Map<string, CategoryRow>();
  for (const [catId, value] of cur.byCategory) {
    const c = catId ? catMap.get(catId) : undefined;
    const parent = c?.parent_id ? catMap.get(c.parent_id) : c;
    const key = parent?.id ?? "none";
    const row = byParent.get(key) ?? { id: key, name: parent?.name ?? "Sin categoría", icon: parent?.icon ?? null, color: parent?.color ?? null, value: 0 };
    row.value += value;
    byParent.set(key, row);
  }
  const catRows = [...byParent.values()].sort((a, b) => b.value - a.value);
  const topCats = catRows.slice(0, 6);
  if (catRows.length > 6) {
    topCats.push({ id: "other", name: "Otras", icon: null, color: "#64748B", value: catRows.slice(6).reduce((s, r) => s + r.value, 0) });
  }

  // Próximos eventos (no financieros)
  const events = (eventsRes.data ?? [])
    .flatMap((e) =>
      occurrencesBetween({ frequency: e.frequency, start_date: e.event_date, end_date: e.end_date }, today, addDays(today, 14)).map((d) => ({
        id: `${e.id}|${d}`,
        date: d,
        title: e.title,
        type: e.event_type,
      })),
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 5);

  const hasPlanned = flow.occurrences.some((o) => o.plannedItemId);
  const onboardingSteps = [
    { done: active.length > 1, label: "Agrega tus cuentas y tarjetas", action: <NewAccountButton variant="secondary" size="sm">Cuenta</NewAccountButton> },
    { done: hasPlanned, label: "Programa tus ingresos y pagos fijos", action: <NewPlannedButton variant="secondary" size="sm">Programado</NewPlannedButton> },
    { done: (txCount.count ?? 0) > 0, label: "Registra tu primer gasto", action: <NewTransactionButton variant="secondary" size="sm" initial={{ kind: "expense" }}>Gasto</NewTransactionButton> },
  ];
  const showSteps = onboardingSteps.some((s) => !s.done);

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <section className="relative overflow-hidden rounded-[1.5rem] bg-navy-950 px-6 py-7 text-white sm:px-8 animate-fade-up">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-teal-500/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-teal-300 first-letter:uppercase">{formatLong(today)}</p>
            <h1 className="mt-1 font-display text-[30px] leading-tight font-semibold sm:text-[36px]">
              {greeting(hourInTz(tz))}, {profile.first_name || "hola"}.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">“{quoteForDate(today)}”</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] px-5 py-4 ring-1 ring-white/10 backdrop-blur">
            <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">Disponible hoy</p>
            <p className="num mt-1 text-[28px] font-bold">{formatMoney(flow.startBalance, currency)}</p>
            <p className="mt-1 text-xs text-white/60">
              Fin de mes estimado: <span className={cn("num font-bold", eom < 0 ? "text-[#ff9b86]" : "text-teal-300")}>{formatMoney(eom, currency)}</span>
            </p>
          </div>
        </div>
      </section>

      {showSteps && (
        <Card className="p-5 animate-fade-up">
          <p className="text-[15px] font-bold text-ink">Completa tu espacio financiero</p>
          <p className="text-sm text-muted">Con estos tres pasos tu flujo de caja futuro empieza a trabajar.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {onboardingSteps.map((s) => (
              <li key={s.label} className={cn("flex items-center gap-3 rounded-xl border p-3", s.done ? "border-positive/20 bg-positive-50" : "border-line")}>
                {s.done ? <CheckCircle2 className="size-5 shrink-0 text-positive" /> : <Circle className="size-5 shrink-0 text-line-strong" />}
                <span className={cn("flex-1 text-sm font-semibold", s.done ? "text-positive" : "text-ink")}>{s.label}</span>
                {!s.done && s.action}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Indicadores del mes */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del mes">
        {[
          { label: "Ingresos del mes", value: cur.income, delta: pctChange(cur.income, prev.income), good: "up" as const },
          { label: "Gastos del mes", value: cur.expense, delta: pctChange(cur.expense, prev.expense), good: "down" as const },
          {
            label: "Ahorro del mes",
            value: cur.savings,
            delta: pctChange(cur.savings, prev.savings),
            good: "up" as const,
            extra: savingsRate !== null ? `Tasa de ahorro ${formatPct(savingsRate, { digits: 0 })}` : undefined,
          },
          {
            label: "Patrimonio en cuentas",
            value: netWorth,
            extra: cardDebt > 0 ? `Incluye deuda de tarjetas ${formatMoney(cardDebt, currency, { compact: true })}` : "Activos menos deudas registradas",
          },
        ].map((k, i) => (
          <Card key={k.label} className="p-5 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="text-[13px] font-semibold text-muted">{k.label}</p>
            <p className={cn("num mt-2 text-[26px] leading-none font-bold", k.value < 0 ? "text-negative" : "text-ink")}>{formatMoney(k.value, currency)}</p>
            <div className="mt-3 flex min-h-6 flex-wrap items-center gap-2">
              {"delta" in k && <Delta value={k.delta ?? null} goodWhen={k.good} />}
              {"delta" in k && k.delta !== null && <span className="text-xs text-muted">vs. {formatShort(prevTo)}</span>}
              {k.extra && <span className="text-xs text-muted">{k.extra}</span>}
            </div>
          </Card>
        ))}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Flujo de caja */}
        <Card className="animate-fade-up">
          <CardHeader
            title="Tu dinero en los próximos 30 días"
            subtitle="Saldo disponible proyectado con tus programados y tarjetas"
            action={
              <Link href="/flujo-de-caja" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700 hover:underline">
                Ver flujo <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="px-3 pt-4 pb-2 sm:px-5">
            <BalanceChart
              currency={currency}
              data={next30.map((d) => ({ date: d.date, closing: d.closing, inflow: d.inflow, outflow: d.outflow }))}
            />
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
            <div className="p-4">
              <p className="text-xs font-semibold text-muted">Entra</p>
              <Money value={next30.reduce((s, d) => s + d.inflow, 0)} currency={currency} className="text-sm font-bold text-positive" />
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-muted">Sale</p>
              <Money value={next30.reduce((s, d) => s + d.outflow, 0)} currency={currency} className="text-sm font-bold text-ink" />
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-muted">Punto más bajo</p>
              <Money
                value={Math.min(...next30.map((d) => d.closing))}
                currency={currency}
                className={cn("text-sm font-bold", Math.min(...next30.map((d) => d.closing)) < 0 ? "text-negative" : "text-ink")}
              />
            </div>
          </div>
          {flow.firstNegativeDate && flow.firstNegativeDate <= addDays(today, 30) && (
            <div className="flex items-start gap-3 border-t border-line bg-negative-50 px-5 py-3 text-sm text-negative">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                <strong>El {formatShort(flow.firstNegativeDate)} tu saldo disponible quedaría en negativo.</strong> Revisa los pagos de esos días o
                planea una transferencia.
              </p>
            </div>
          )}
        </Card>

        {/* Próximos pagos */}
        <Card className="animate-fade-up">
          <CardHeader
            title="Próximos pagos y cobros"
            subtitle="Siguientes 14 días"
            action={
              <Link href="/programados" className="text-sm font-bold text-teal-700 hover:underline">
                Programados
              </Link>
            }
          />
          <div className="px-5 pb-2">
            <UpcomingList
              items={upcoming}
              baseCurrency={currency}
              empty={
                <EmptyState
                  icon={<CalendarDays className="size-7" />}
                  title="Sin pagos programados"
                  description="Agrega tu salario, arriendo, servicios y cuotas para ver tu flujo de caja futuro."
                  action={<NewPlannedButton>Programar pago</NewPlannedButton>}
                />
              }
            />
          </div>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Gastos por categoría */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="¿En qué se va tu dinero este mes?"
            subtitle={cur.expense ? `${formatMoney(cur.expense, currency)} en gastos hasta hoy` : undefined}
            action={
              <Link href="/movimientos" className="text-sm font-bold text-teal-700 hover:underline">
                Movimientos
              </Link>
            }
          />
          <div className="p-5">
            {topCats.length ? (
              <CategoryBars rows={topCats} total={cur.expense} currency={currency} />
            ) : (
              <EmptyState
                title="No tienes gastos registrados este mes."
                action={<NewTransactionButton initial={{ kind: "expense" }}>Registrar mi primer gasto</NewTransactionButton>}
                className="py-6"
              />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          {/* Tarjetas */}
          <Card>
            <CardHeader
              title="Tarjetas"
              action={
                <Link href="/tarjetas" className="text-sm font-bold text-teal-700 hover:underline">
                  Ver
                </Link>
              }
            />
            <div className="space-y-4 p-5">
              {cards.length ? (
                cards.slice(0, 3).map((c) => {
                  const used = Math.max(0, -c.balance);
                  const pct = c.credit_limit ? (used / c.credit_limit) * 100 : 0;
                  const due = c.due_day ? nextDayOfMonth(c.due_day, today) : null;
                  const dueIn = due ? diffDays(due, today) : null;
                  return (
                    <div key={c.id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-semibold text-ink">{c.name}</span>
                        <Money value={used} currency={c.currency} className="font-bold" />
                      </div>
                      <Progress value={pct} tone={pct >= 90 ? "negative" : pct >= 70 ? "warning" : "brand"} className="mt-2" label={`Uso de ${c.name}`} />
                      <p className="mt-1.5 flex items-center justify-between text-xs text-muted">
                        <span>{formatPct(pct, { digits: 0 })} del cupo</span>
                        {due && <span className={cn(dueIn !== null && dueIn <= 3 && used > 0 && "font-bold text-warning")}>Pago {formatShort(due)}</span>}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted">
                  <CreditCard className="size-5" /> Sin tarjetas registradas.
                  <NewAccountButton variant="ghost" size="sm" initial={{ type: "credit_card" }}>
                    Agregar
                  </NewAccountButton>
                </div>
              )}
            </div>
          </Card>

          {/* Eventos */}
          <Card>
            <CardHeader
              title="Próximos eventos"
              action={
                <Link href="/calendario" className="text-sm font-bold text-teal-700 hover:underline">
                  Calendario
                </Link>
              }
            />
            <ul className="space-y-3 p-5">
              {events.length ? (
                events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm">
                    <span className="grid w-11 shrink-0 place-items-center rounded-lg bg-canvas py-1 text-center leading-tight">
                      <span className="text-[10px] font-bold text-muted uppercase">{monthShort(e.date)}</span>
                      <span className="num text-base font-bold text-ink">{Number(e.date.slice(8))}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{e.title}</span>
                    <Badge>{EVENT_TYPE_LABELS[e.type]}</Badge>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">Nada en los próximos 14 días.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      {/* Ecosistema Data Edge */}
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-surface to-teal-50 p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-navy-900 text-teal-300">
            <Waves className="size-5" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">¿Tienes un negocio?</p>
            <p className="text-sm text-muted">Conoce las plantillas, simuladores y modelos financieros de Data Edge para empresas.</p>
          </div>
        </div>
        <a
          href={process.env.NEXT_PUBLIC_DATA_EDGE_URL ?? "https://dataedgeconsulting.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
        >
          Ver Data Edge Empresas <ExternalLink className="size-4" />
        </a>
      </Card>
    </div>
  );
}
