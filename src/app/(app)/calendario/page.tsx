import type { Metadata } from "next";
import { getAccounts, getCashflow, getContext } from "@/lib/data";
import { addDays, addMonthsClamped, endOfMonth, isValidISODate, isValidMonth, startOfWeek } from "@/lib/dates";
import { nextDayOfMonth, occurrencesBetween } from "@/lib/recurrence";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/misc";
import { NewEventButton } from "@/components/app/open-buttons";
import { CalendarView, type CalItem } from "./view";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ mes?: string; vista?: string; dia?: string }> }) {
  const sp = await searchParams;
  const { supabase, today, currency } = await getContext();
  const month = isValidMonth(sp.mes) ? sp.mes! : today.slice(0, 7);
  const view = sp.vista === "semana" || sp.vista === "agenda" ? sp.vista : "mes";
  const selected = isValidISODate(sp.dia) ? sp.dia! : month === today.slice(0, 7) ? today : `${month}-01`;

  // Rango visible: semanas completas del mes (lunes a domingo)
  const gridFrom = startOfWeek(`${month}-01`);
  const gridTo = addDays(startOfWeek(endOfMonth(`${month}-01`)), 6);
  const from = view === "semana" ? startOfWeek(selected) : gridFrom;
  const to = view === "semana" ? addDays(startOfWeek(selected), 6) : gridTo;

  const horizon = to > today ? to : today;
  const [accounts, flow, txRes, evRes] = await Promise.all([
    getAccounts(),
    getCashflow(horizon),
    supabase
      .from("transactions")
      .select("id, kind, date, amount, account_id, to_account_id, to_amount, category_id, description, notes, planned_item_id, planned_date")
      .gte("date", from)
      .lte("date", to < today ? to : today)
      .order("date"),
    supabase.from("calendar_events").select("*").lte("event_date", to),
  ]);
  const acc = new Map(accounts.map((a) => [a.id, a]));
  const items: CalItem[] = [];

  // Movimientos reales (pasado y hoy)
  for (const t of txRes.data ?? []) {
    const a = acc.get(t.account_id);
    items.push({
      id: `tx|${t.id}`,
      date: t.date,
      title: t.description || (t.kind === "transfer" ? `${a?.name ?? ""} → ${acc.get(t.to_account_id!)?.name ?? ""}` : t.kind === "income" ? "Ingreso" : "Gasto"),
      type: "tx",
      tone: t.kind === "income" ? "in" : t.kind === "expense" ? "out" : "neutral",
      amount: Number(t.amount),
      currency: a?.currency ?? "COP",
      tx: { ...t, amount: Number(t.amount), to_amount: t.to_amount === null ? null : Number(t.to_amount) },
    });
  }

  // Programados pendientes (hoy en adelante; vencidos aparecen hoy)
  for (const o of flow.occurrences) {
    if (o.date < from || o.date > to) continue;
    items.push({
      id: `pl|${o.key}`,
      date: o.date,
      title: o.name,
      type: o.flow === "card_estimate" ? "card" : "planned",
      tone: o.flow === "income" ? "in" : o.cashEffect < 0 || o.flow === "expense" ? "out" : "neutral",
      amount: o.amount,
      currency: o.currency,
      overdue: o.overdue,
      occurrence: o,
    });
  }

  // Fechas de corte y pago de tarjetas
  for (const c of accounts.filter((a) => a.type === "credit_card" && !a.is_archived)) {
    for (let m = addMonthsClamped(`${from.slice(0, 7)}-01`, 0); m <= to; m = addMonthsClamped(m, 1)) {
      const cut = nextDayOfMonth(c.statement_day ?? 1, m);
      if (cut >= from && cut <= to && cut.slice(0, 7) === m.slice(0, 7))
        items.push({ id: `cut|${c.id}|${cut}`, date: cut, title: `Corte ${c.name}`, type: "cardDate", tone: "neutral" });
      const due = nextDayOfMonth(c.due_day ?? 1, m);
      const hasEstimate = items.some((i) => i.type === "card" && i.date === due && i.occurrence?.toAccountId === c.id);
      if (!hasEstimate && due >= from && due <= to && due.slice(0, 7) === m.slice(0, 7))
        items.push({ id: `due|${c.id}|${due}`, date: due, title: `Límite de pago ${c.name}`, type: "cardDate", tone: "neutral" });
    }
  }

  // Eventos
  for (const e of evRes.data ?? []) {
    for (const d of occurrencesBetween({ frequency: e.frequency, start_date: e.event_date, end_date: e.end_date }, from, to)) {
      items.push({
        id: `ev|${e.id}|${d}`,
        date: d,
        title: e.title,
        subtitle: [EVENT_TYPE_LABELS[e.event_type], e.event_time?.slice(0, 5)].filter(Boolean).join(" · "),
        type: "event",
        tone: "event",
        event: e,
      });
    }
  }

  const balances: Record<string, number> = {};
  for (const d of flow.days) if (d.date >= from && d.date <= to) balances[d.date] = d.closing;

  return (
    <>
      <PageHeader
        title="Calendario financiero"
        subtitle="Fechas y dinero en un solo lugar. Los días futuros muestran tu saldo disponible estimado."
        actions={<NewEventButton variant="secondary">Nuevo evento</NewEventButton>}
      />
      <CalendarView
        month={month}
        view={view}
        selected={selected}
        today={today}
        from={from}
        to={to}
        items={items}
        balances={balances}
        currency={currency}
      />
    </>
  );
}
