"use server";

import { z } from "zod";
import { getContext, getObligations } from "@/lib/data";
import { isValidISODate } from "@/lib/dates";
import { parseAmountInput } from "@/lib/money";
import { installmentAmounts, installmentDates } from "@/lib/obligations";
import { dbError, done, fail, optStr, str, zodFail } from "./helpers";
import type { ActionState } from "./types";

const uuid = z.uuid("Selección no válida");
const isoDate = z.string().refine(isValidISODate, "Fecha no válida");
const money = z.number({ message: "Escribe un monto" }).positive("Debe ser mayor a cero").max(1e14, "Monto demasiado alto");
const frequency = z.enum(["once", "weekly", "biweekly", "semimonthly", "monthly", "bimonthly", "quarterly", "semiannual", "yearly"]);
const kinds = ["bank_loan", "mortgage", "vehicle", "personal", "tax", "service", "education", "health", "rent", "other"] as const;

const amountOf = (fd: FormData, k: string) => {
  const raw = str(fd, k);
  return raw ? parseAmountInput(raw) : undefined;
};

const obligationSchema = z
  .object({
    creditor: z.string().min(1, "¿A quién le debes?").max(80),
    class_id: z.uuid("Elige la clasificación"),
    kind: z.enum(kinds),
    concept: z.string().min(1, "Escribe el concepto").max(120),
    currency: z.enum(["COP", "USD", "EUR", "MXN", "GBP"]),
    original_amount: money,
    installment_amount: z.number().positive().max(1e14).nullable(),
    installments: z.number().int("Número entero").min(1, "Mínimo 1").max(600, "Máximo 600"),
    frequency,
    first_due_date: isoDate,
    interest_rate: z.number().min(0).max(1000).nullable(),
    account_id: z.uuid().nullable(),
    notes: z.string().max(500).nullable(),
  })
  .transform((v) => (v.frequency === "once" ? { ...v, installments: 1 } : v));

type ObligationValues = z.output<typeof obligationSchema>;

/** Crea, actualiza o quita el programado que lleva las cuotas al flujo de caja y al calendario. */
async function syncPlanned(
  supabase: Awaited<ReturnType<typeof getContext>>["supabase"],
  v: ObligationValues & { status: string },
  plannedId: string | null,
): Promise<string | null> {
  if (!v.account_id) {
    if (plannedId) await supabase.from("planned_items").delete().eq("id", plannedId);
    return null;
  }
  const dates = installmentDates(v);
  const amounts = installmentAmounts(v);
  const row = {
    kind: "expense" as const,
    name: `${v.creditor} · ${v.concept}`.slice(0, 80),
    amount: amounts[0],
    account_id: v.account_id,
    to_account_id: null,
    // Las cuotas de una obligación no son un gasto: sin categoría de gasto.
    category_id: null,
    frequency: v.installments === 1 ? ("once" as const) : v.frequency,
    start_date: dates[0],
    end_date: v.installments === 1 ? null : dates[dates.length - 1],
    is_active: v.status === "active",
    notes: "Cuotas de una obligación. Se actualiza desde Obligaciones.",
  };
  if (plannedId) {
    const { error } = await supabase.from("planned_items").update(row).eq("id", plannedId);
    if (!error) return plannedId;
  }
  const { data } = await supabase.from("planned_items").insert(row).select("id").single();
  return data?.id ?? null;
}

export async function saveObligation(_: ActionState, fd: FormData): Promise<ActionState> {
  const rate = str(fd, "interest_rate").replace(",", ".");
  const parsed = obligationSchema.safeParse({
    creditor: str(fd, "creditor"),
    class_id: str(fd, "class_id"),
    kind: str(fd, "kind") || "other",
    concept: str(fd, "concept"),
    currency: str(fd, "currency") || "COP",
    original_amount: amountOf(fd, "original_amount"),
    installment_amount: amountOf(fd, "installment_amount") ?? null,
    installments: Number(str(fd, "installments") || 1),
    frequency: str(fd, "frequency") || "monthly",
    first_due_date: str(fd, "first_due_date"),
    interest_rate: rate ? Number(rate) : null,
    account_id: optStr(fd, "account_id"),
    notes: optStr(fd, "notes"),
  });
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const { supabase } = await getContext();
  const id = optStr(fd, "id");

  // La cuenta de pago define la moneda de las cuotas en el flujo.
  if (v.account_id) {
    const { data: acc } = await supabase.from("accounts").select("currency, type").eq("id", v.account_id).single();
    if (!acc) return fail("La cuenta de pago no es válida.", { account_id: "Elige otra cuenta" });
    if (acc.currency !== v.currency)
      return fail("La cuenta de pago debe estar en la misma moneda de la obligación.", { account_id: `Esta cuenta está en ${acc.currency}` });
  }

  const { data: cls } = await supabase.from("obligation_categories").select("name").eq("id", v.class_id).maybeSingle();
  if (!cls) return fail("La clasificación no es válida.", { class_id: "Elige otra clasificación" });

  let current: { planned_item_id: string | null; status: string } | null = null;
  if (id) {
    const { data } = await supabase.from("obligations").select("planned_item_id, status").eq("id", id).single();
    if (!data) return fail("Obligación no encontrada");
    current = data;
  }

  const status = current?.status ?? "active";
  const plannedId = await syncPlanned(supabase, { ...v, status }, current?.planned_item_id ?? null);
  const row = {
    ...v,
    creditor_type: cls.name === "Personas naturales" ? "person" : "entity",
    category_id: null,
    planned_item_id: plannedId,
  };

  const { error } = id
    ? await supabase.from("obligations").update(row).eq("id", id)
    : await supabase.from("obligations").insert(row);
  if (error) {
    if (!id && plannedId) await supabase.from("planned_items").delete().eq("id", plannedId);
    return dbError(error);
  }
  return done(id ? "Obligación actualizada" : v.account_id ? "Obligación creada. Sus cuotas ya están en tu flujo de caja." : "Obligación creada");
}

export async function setObligationStatus(id: string, status: "active" | "cancelled"): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Obligación no válida");
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("obligations").update({ status }).eq("id", id).select("planned_item_id").single();
  if (error) return dbError(error);
  if (data?.planned_item_id) await supabase.from("planned_items").update({ is_active: status === "active" }).eq("id", data.planned_item_id);
  return done(status === "cancelled" ? "Obligación anulada. Sale de tus totales y del flujo." : "Obligación reactivada");
}

export async function deleteObligation(id: string): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Obligación no válida");
  const { supabase } = await getContext();
  const { data } = await supabase.from("obligations").select("planned_item_id").eq("id", id).single();
  const { error } = await supabase.from("obligations").delete().eq("id", id);
  if (error) return dbError(error);
  if (data?.planned_item_id) await supabase.from("planned_items").delete().eq("id", data.planned_item_id);
  return done("Obligación eliminada. Los pagos hechos siguen en tus movimientos.");
}

/**
 * Registra un pago: crea un gasto real desde la cuenta elegida, vinculado a la
 * obligación (y a la cuota del programado, para que el flujo la dé por pagada).
 */
export async function registerObligationPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({ obligation_id: uuid, account_id: uuid, amount: money, date: isoDate, notes: z.string().max(500).nullable() })
    .safeParse({
      obligation_id: str(fd, "obligation_id"),
      account_id: str(fd, "account_id"),
      amount: amountOf(fd, "amount"),
      date: str(fd, "date"),
      notes: optStr(fd, "notes"),
    });
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const { supabase, today } = await getContext();
  if (v.date > today) return fail("El pago no puede tener fecha futura.", { date: "Usa la fecha en que pagaste" });

  const { items } = await getObligations();
  const item = items.find((i) => i.row.id === v.obligation_id);
  if (!item) return fail("Obligación no encontrada");
  if (item.row.status === "cancelled") return fail("La obligación está anulada. Reactívala para registrar pagos.");

  const { row, summary } = item;
  const next = summary.next;
  const { error } = await supabase.from("transactions").insert({
    // Sale de la cuenta (flujo real), pero no es un gasto: sin categoría de gasto.
    kind: "expense",
    amount: v.amount,
    account_id: v.account_id,
    category_id: null,
    date: v.date,
    description: `${row.creditor} · ${row.concept}${next ? ` (cuota ${next.n}/${summary.schedule.length})` : ""}`.slice(0, 140),
    notes: v.notes,
    obligation_id: row.id,
    planned_item_id: row.planned_item_id && next ? row.planned_item_id : null,
    planned_date: row.planned_item_id && next ? next.date : null,
  });
  if (error) return dbError(error);

  const remaining = summary.pending - v.amount;
  return done(remaining <= 0.005 ? `¡Pagaste por completo ${row.concept}!` : "Pago registrado. Saldo y flujo actualizados.");
}

// ------------------------------------------------------------------
// Clasificación: subcategorías de "Obligaciones financieras"
// ------------------------------------------------------------------
export async function saveObligationClass(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z.object({ name: z.string().min(1, "Escribe un nombre").max(60) }).safeParse({ name: str(fd, "name") });
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase } = await getContext();
  const id = optStr(fd, "id");
  const { error } = id
    ? await supabase.from("obligation_categories").update(parsed.data).eq("id", id)
    : await supabase.from("obligation_categories").insert({ ...parsed.data, sort_order: 50 });
  if (error) return dbError(error);
  return done(id ? "Clasificación actualizada" : "Clasificación creada");
}

export async function setObligationClassArchived(id: string, archived: boolean): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Clasificación no válida");
  const { supabase } = await getContext();
  const { error } = await supabase.from("obligation_categories").update({ is_archived: archived }).eq("id", id);
  return error ? dbError(error) : done(archived ? "Clasificación archivada" : "Clasificación restaurada");
}
