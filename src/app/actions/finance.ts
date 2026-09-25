"use server";

import { z } from "zod";
import { getContext } from "@/lib/data";
import { formatMedium, isValidISODate } from "@/lib/dates";
import { parseAmountInput } from "@/lib/money";
import { dbError, done, fail, optStr, str, zodFail } from "./helpers";
import type { ActionState } from "./types";

const uuid = z.uuid("Selección no válida");
const optUuid = z.uuid().nullable();
const isoDate = z.string().refine(isValidISODate, "Fecha no válida");
const amount = z.number({ message: "Escribe un monto" }).positive("El monto debe ser mayor a cero").max(1e14, "Monto demasiado alto");
const kind = z.enum(["income", "expense", "transfer"]);
const currency = z.enum(["COP", "USD", "EUR", "MXN", "GBP"]);
const frequency = z.enum(["once", "weekly", "biweekly", "semimonthly", "monthly", "bimonthly", "quarterly", "semiannual", "yearly"]);

const amountOf = (fd: FormData, k: string) => {
  const raw = str(fd, k);
  return raw ? parseAmountInput(raw) : undefined;
};

// ------------------------------------------------------------------
// Movimientos
// ------------------------------------------------------------------
const txSchema = z
  .object({
    kind,
    amount,
    account_id: uuid,
    to_account_id: optUuid,
    to_amount: z.number().positive().nullable(),
    category_id: optUuid,
    date: isoDate,
    description: z.string().max(140).nullable(),
    notes: z.string().max(500).nullable(),
    planned_item_id: optUuid,
    planned_date: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "transfer" && !v.to_account_id)
      ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Elige la cuenta destino" });
    if (v.kind === "transfer" && v.to_account_id === v.account_id)
      ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Debe ser una cuenta distinta" });
  });

export async function saveTransaction(_: ActionState, fd: FormData): Promise<ActionState> {
  const k = str(fd, "kind");
  const parsed = txSchema.safeParse({
    kind: k,
    amount: amountOf(fd, "amount"),
    account_id: str(fd, "account_id"),
    to_account_id: k === "transfer" ? optStr(fd, "to_account_id") : null,
    to_amount: k === "transfer" ? (amountOf(fd, "to_amount") ?? null) : null,
    category_id: k === "transfer" ? null : optStr(fd, "category_id"),
    date: str(fd, "date"),
    description: optStr(fd, "description"),
    notes: optStr(fd, "notes"),
    planned_item_id: optStr(fd, "planned_item_id"),
    planned_date: optStr(fd, "planned_date"),
  });
  if (!parsed.success) return zodFail(parsed.error);

  const { supabase, today } = await getContext();
  const id = optStr(fd, "id");
  const row = parsed.data;

  // Algo con fecha futura aún no ha ocurrido: no puede afectar el saldo real.
  if (row.date > today) {
    if (id || row.planned_item_id) {
      return fail("La fecha no puede ser futura: un movimiento real ya ocurrió.", {
        date: "Usa hoy o una fecha pasada. Para algo futuro, prográmalo.",
      });
    }
    const label = row.description || (row.kind === "income" ? "Ingreso" : row.kind === "expense" ? "Gasto" : "Transferencia");
    const { error: pe } = await supabase.from("planned_items").insert({
      kind: row.kind,
      name: label.slice(0, 80),
      amount: row.amount,
      account_id: row.account_id,
      to_account_id: row.to_account_id,
      category_id: row.category_id,
      frequency: "once",
      start_date: row.date,
      notes: row.notes,
    });
    if (pe) return dbError(pe);
    return done(`Como la fecha es futura, quedó programado para el ${formatMedium(row.date)}. Confírmalo cuando ocurra.`);
  }

  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id)
    : await supabase.from("transactions").insert(row);
  if (error) return dbError(error);

  // Pago parcial que el usuario da por completo (no llegará el resto)
  if (row.planned_item_id && row.planned_date && fd.get("close_occurrence") === "on") {
    const { error: e2 } = await supabase
      .from("planned_occurrence_status")
      .upsert(
        { planned_item_id: row.planned_item_id, planned_date: row.planned_date, status: "closed" },
        { onConflict: "planned_item_id,planned_date" },
      );
    if (e2) return dbError(e2);
  }
  const label = row.kind === "income" ? "Ingreso" : row.kind === "expense" ? "Gasto" : "Transferencia";
  return done(id ? `${label} actualizado` : `${label} registrado`);
}

/**
 * Confirma que una ocurrencia programada sí ocurrió, por el valor pendiente.
 * Crea el movimiento real con la fecha programada (o hoy si aún no llega).
 */
export async function confirmOccurrence(plannedItemId: string, plannedDate: string): Promise<ActionState> {
  if (!uuid.safeParse(plannedItemId).success || !isValidISODate(plannedDate)) return fail("Programado no válido");
  const { supabase, today } = await getContext();
  const [{ data: item }, { data: prev }] = await Promise.all([
    supabase.from("planned_items").select("*").eq("id", plannedItemId).single(),
    supabase.from("transactions").select("amount").eq("planned_item_id", plannedItemId).eq("planned_date", plannedDate),
  ]);
  if (!item) return fail("No encontramos ese programado.");
  const received = (prev ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const pending = Math.round((Number(item.amount) - received) * 100) / 100;
  if (pending <= 0) return fail("Ya estaba confirmado completo.");
  const { error } = await supabase.from("transactions").insert({
    kind: item.kind,
    amount: pending,
    account_id: item.account_id,
    to_account_id: item.to_account_id,
    category_id: item.category_id,
    description: item.name,
    date: plannedDate <= today ? plannedDate : today,
    planned_item_id: item.id,
    planned_date: plannedDate,
  });
  if (error) return dbError(error);
  return done(item.kind === "income" ? `${item.name}: ingreso confirmado` : `${item.name}: pago confirmado`);
}

/**
 * Estado manual de una ocurrencia programada:
 * closed = darla por completa · skipped = omitirla · null = volver a pendiente.
 */
export async function setOccurrenceStatus(
  plannedItemId: string,
  plannedDate: string,
  status: "closed" | "skipped" | null,
): Promise<ActionState> {
  if (!uuid.safeParse(plannedItemId).success || !isValidISODate(plannedDate)) return fail("Programado no válido");
  const { supabase } = await getContext();
  const { error } = status
    ? await supabase
        .from("planned_occurrence_status")
        .upsert({ planned_item_id: plannedItemId, planned_date: plannedDate, status }, { onConflict: "planned_item_id,planned_date" })
    : await supabase.from("planned_occurrence_status").delete().eq("planned_item_id", plannedItemId).eq("planned_date", plannedDate);
  if (error) return dbError(error);
  return done(status === "skipped" ? "Omitido para esta fecha" : status === "closed" ? "Marcado como completo" : "Vuelve a estar pendiente");
}

export async function updateTheme(theme: string): Promise<ActionState> {
  const parsed = z.enum(["data-edge", "oceano", "esmeralda", "violeta", "grafito", "vino"]).safeParse(theme);
  if (!parsed.success) return fail("Paleta no válida");
  const { supabase, userId } = await getContext();
  const { error } = await supabase.from("profiles").update({ theme: parsed.data }).eq("id", userId);
  return error ? dbError(error) : done("Paleta aplicada");
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Movimiento no válido");
  const { supabase } = await getContext();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  return error ? dbError(error) : done("Movimiento eliminado");
}

// ------------------------------------------------------------------
// Cuentas y tarjetas
// ------------------------------------------------------------------
const accountSchema = z
  .object({
    name: z.string().min(1, "Escribe un nombre").max(80),
    type: z.enum(["bank_savings", "bank_checking", "cash", "digital_wallet", "investment", "credit_card", "other"]),
    institution: z.string().max(80).nullable(),
    currency,
    opening_balance: z.number().finite("Saldo no válido"),
    opening_date: isoDate,
    include_in_net_worth: z.boolean(),
    credit_limit: z.number().nonnegative().nullable(),
    statement_day: z.number().int().min(1).max(31).nullable(),
    due_day: z.number().int().min(1).max(31).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "credit_card") {
      if (v.credit_limit === null) ctx.addIssue({ code: "custom", path: ["credit_limit"], message: "Escribe el cupo" });
      if (v.statement_day === null) ctx.addIssue({ code: "custom", path: ["statement_day"], message: "Día de corte" });
      if (v.due_day === null) ctx.addIssue({ code: "custom", path: ["due_day"], message: "Día de pago" });
    }
  });

const intOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v ? Number(v) : null;
};

export async function saveAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const type = str(fd, "type");
  const isCard = type === "credit_card";
  const balanceRaw = amountOf(fd, "opening_balance") ?? 0;
  const negative = str(fd, "balance_sign") === "negative";
  // Tarjeta: el usuario escribe la deuda en positivo; se guarda negativa
  const opening_balance = isCard ? -Math.abs(balanceRaw) : negative ? -Math.abs(balanceRaw) : balanceRaw;

  const parsed = accountSchema.safeParse({
    name: str(fd, "name"),
    type,
    institution: optStr(fd, "institution"),
    currency: str(fd, "currency") || "COP",
    opening_balance,
    opening_date: str(fd, "opening_date"),
    include_in_net_worth: fd.get("include_in_net_worth") === "on",
    credit_limit: isCard ? (amountOf(fd, "credit_limit") ?? null) : null,
    statement_day: isCard ? intOrNull(fd, "statement_day") : null,
    due_day: isCard ? intOrNull(fd, "due_day") : null,
  });
  if (!parsed.success) return zodFail(parsed.error);

  const { supabase } = await getContext();
  const id = optStr(fd, "id");
  const { error } = id
    ? await supabase.from("accounts").update(parsed.data).eq("id", id)
    : await supabase.from("accounts").insert(parsed.data);
  if (error) return dbError(error);
  return done(id ? "Cuenta actualizada" : isCard ? "Tarjeta creada" : "Cuenta creada");
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Cuenta no válida");
  const { supabase } = await getContext();
  const { error } = await supabase.from("accounts").update({ is_archived: archived }).eq("id", id);
  return error ? dbError(error) : done(archived ? "Cuenta archivada" : "Cuenta restaurada");
}

export async function deleteAccount(id: string): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Cuenta no válida");
  const { supabase } = await getContext();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(`account_id.eq.${id},to_account_id.eq.${id}`);
  if (count) return fail(`La cuenta tiene ${count} movimientos. Archívala en lugar de eliminarla.`);
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  return error ? dbError(error) : done("Cuenta eliminada");
}

// ------------------------------------------------------------------
// Programados
// ------------------------------------------------------------------
const plannedSchema = z
  .object({
    kind,
    name: z.string().min(1, "Escribe un nombre").max(80),
    amount,
    account_id: uuid,
    to_account_id: optUuid,
    category_id: optUuid,
    frequency,
    start_date: isoDate,
    end_date: isoDate.nullable(),
    notes: z.string().max(500).nullable(),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "transfer" && !v.to_account_id)
      ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Elige la cuenta destino" });
    if (v.kind === "transfer" && v.to_account_id === v.account_id)
      ctx.addIssue({ code: "custom", path: ["to_account_id"], message: "Debe ser una cuenta distinta" });
    if (v.end_date && v.end_date < v.start_date)
      ctx.addIssue({ code: "custom", path: ["end_date"], message: "Debe ser posterior al inicio" });
  });

export async function savePlanned(_: ActionState, fd: FormData): Promise<ActionState> {
  const k = str(fd, "kind");
  const freq = str(fd, "frequency");
  const parsed = plannedSchema.safeParse({
    kind: k,
    name: str(fd, "name"),
    amount: amountOf(fd, "amount"),
    account_id: str(fd, "account_id"),
    to_account_id: k === "transfer" ? optStr(fd, "to_account_id") : null,
    category_id: k === "transfer" ? null : optStr(fd, "category_id"),
    frequency: freq,
    start_date: str(fd, "start_date"),
    end_date: freq === "once" ? null : optStr(fd, "end_date"),
    notes: optStr(fd, "notes"),
    is_active: fd.get("is_active") !== "off",
  });
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase } = await getContext();
  const id = optStr(fd, "id");
  const { error } = id
    ? await supabase.from("planned_items").update(parsed.data).eq("id", id)
    : await supabase.from("planned_items").insert(parsed.data);
  if (error) return dbError(error);
  return done(id ? "Programado actualizado" : "Programado creado");
}

export async function setPlannedActive(id: string, active: boolean): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Programado no válido");
  const { supabase } = await getContext();
  const { error } = await supabase.from("planned_items").update({ is_active: active }).eq("id", id);
  return error ? dbError(error) : done(active ? "Programado activado" : "Programado pausado");
}

export async function deletePlanned(id: string): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Programado no válido");
  const { supabase } = await getContext();
  const { error } = await supabase.from("planned_items").delete().eq("id", id);
  return error ? dbError(error) : done("Programado eliminado");
}

// ------------------------------------------------------------------
// Eventos de calendario
// ------------------------------------------------------------------
const eventSchema = z.object({
  title: z.string().min(1, "Escribe un título").max(100),
  event_type: z.enum(["birthday", "appointment", "activity", "reminder", "other"]),
  event_date: isoDate,
  event_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  frequency,
  end_date: isoDate.nullable(),
  remind_days_before: z.number().int().min(0).max(60),
  notes: z.string().max(500).nullable(),
});

export async function saveEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  const type = str(fd, "event_type");
  const parsed = eventSchema.safeParse({
    title: str(fd, "title"),
    event_type: type,
    event_date: str(fd, "event_date"),
    event_time: optStr(fd, "event_time"),
    frequency: type === "birthday" ? "yearly" : str(fd, "frequency") || "once",
    end_date: optStr(fd, "end_date"),
    remind_days_before: Number(str(fd, "remind_days_before") || 0),
    notes: optStr(fd, "notes"),
  });
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase } = await getContext();
  const id = optStr(fd, "id");
  const { error } = id
    ? await supabase.from("calendar_events").update(parsed.data).eq("id", id)
    : await supabase.from("calendar_events").insert(parsed.data);
  if (error) return dbError(error);
  return done(id ? "Evento actualizado" : "Evento creado");
}

export async function deleteEvent(id: string): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Evento no válido");
  const { supabase } = await getContext();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  return error ? dbError(error) : done("Evento eliminado");
}

// ------------------------------------------------------------------
// Categorías
// ------------------------------------------------------------------
export async function saveCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      name: z.string().min(1, "Escribe un nombre").max(60),
      kind: z.enum(["income", "expense"]),
      parent_id: optUuid,
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
    })
    .safeParse({
      name: str(fd, "name"),
      kind: str(fd, "kind"),
      parent_id: optStr(fd, "parent_id"),
      color: optStr(fd, "color"),
    });
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase } = await getContext();
  const id = optStr(fd, "id");
  let row: typeof parsed.data & { icon?: string | null } = parsed.data;
  if (!id && row.parent_id) {
    const { data: parent } = await supabase.from("categories").select("icon, color").eq("id", row.parent_id).single();
    row = { ...row, icon: parent?.icon ?? null, color: row.color ?? parent?.color ?? null };
  }
  const { error } = id
    ? await supabase.from("categories").update({ name: row.name, color: row.color }).eq("id", id)
    : await supabase.from("categories").insert(row);
  if (error) return dbError(error);
  return done(id ? "Categoría actualizada" : "Categoría creada");
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Categoría no válida");
  const { supabase } = await getContext();
  const { error } = await supabase.from("categories").update({ is_archived: archived }).eq("id", id);
  return error ? dbError(error) : done(archived ? "Categoría archivada" : "Categoría restaurada");
}

// ------------------------------------------------------------------
// Perfil, onboarding y tasas
// ------------------------------------------------------------------
export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      first_name: z.string().min(1, "Escribe tu nombre").max(80),
      last_name: z.string().max(80).nullable(),
      country: z.string().min(2).max(2),
      city: z.string().max(80).nullable(),
      base_currency: currency,
      timezone: z.string().min(3).max(60),
    })
    .safeParse({
      first_name: str(fd, "first_name"),
      last_name: optStr(fd, "last_name"),
      country: str(fd, "country") || "CO",
      city: optStr(fd, "city"),
      base_currency: str(fd, "base_currency") || "COP",
      timezone: str(fd, "timezone") || "America/Bogota",
    });
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase, userId } = await getContext();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  return error ? dbError(error) : done("Perfil actualizado");
}

const onboardingSchema = z.object({
  main_goal: z.enum(["organize_expenses", "save_more", "get_out_of_debt", "family_finances", "start_investing", "build_wealth", "plan_goal"]),
  first_name: z.string().min(1).max(80),
  accounts: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        type: z.enum(["bank_savings", "bank_checking", "cash", "digital_wallet", "investment", "credit_card"]),
        balance: z.number().finite(),
        credit_limit: z.number().nonnegative().nullable(),
        statement_day: z.number().int().min(1).max(31).nullable(),
        due_day: z.number().int().min(1).max(31).nullable(),
      }),
    )
    .max(15),
  income: z
    .object({ name: z.string().min(1).max(80), amount, frequency, start_date: isoDate, account_index: z.number().int().min(-1) })
    .nullable(),
  expenses: z
    .array(z.object({ name: z.string().min(1).max(80), amount, start_date: isoDate, category_name: z.string().nullable() }))
    .max(15),
});

export type OnboardingPayload = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(payload: OnboardingPayload): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase, userId, today } = await getContext();
  const p = parsed.data;

  const { error: pe } = await supabase
    .from("profiles")
    .update({ main_goal: p.main_goal, first_name: p.first_name })
    .eq("id", userId);
  if (pe) return dbError(pe);

  const created: string[] = [];
  for (const [i, a] of p.accounts.entries()) {
    const isCard = a.type === "credit_card";
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        name: a.name,
        type: a.type,
        opening_balance: isCard ? -Math.abs(a.balance) : a.balance,
        opening_date: today,
        credit_limit: isCard ? (a.credit_limit ?? 0) : null,
        statement_day: isCard ? (a.statement_day ?? 1) : null,
        due_day: isCard ? (a.due_day ?? 15) : null,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error) return dbError(error);
    created.push(data.id);
  }

  // Cuenta por defecto para programados: la primera líquida creada o el efectivo
  const { data: accs } = await supabase.from("accounts").select("id, type").order("sort_order");
  const liquid = (accs ?? []).filter((a) => ["bank_savings", "bank_checking", "digital_wallet", "cash"].includes(a.type));
  const defaultAccount = liquid[0]?.id;

  if (p.income && defaultAccount) {
    const target = p.income.account_index >= 0 ? created[p.income.account_index] : defaultAccount;
    const { data: cat } = await supabase.from("categories").select("id").eq("kind", "income").eq("name", "Salario").maybeSingle();
    const { error } = await supabase.from("planned_items").insert({
      kind: "income",
      name: p.income.name,
      amount: p.income.amount,
      account_id: target ?? defaultAccount,
      category_id: cat?.id ?? null,
      frequency: p.income.frequency,
      start_date: p.income.start_date,
    });
    if (error) return dbError(error);
  }

  if (defaultAccount && p.expenses.length) {
    const { data: cats } = await supabase.from("categories").select("id, name").eq("kind", "expense");
    const byName = new Map((cats ?? []).map((c) => [c.name, c.id]));
    const { error } = await supabase.from("planned_items").insert(
      p.expenses.map((e) => ({
        kind: "expense" as const,
        name: e.name,
        amount: e.amount,
        account_id: defaultAccount,
        category_id: (e.category_name && byName.get(e.category_name)) || null,
        frequency: "monthly" as const,
        start_date: e.start_date,
      })),
    );
    if (error) return dbError(error);
  }

  const { error } = await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", userId);
  if (error) return dbError(error);
  // Sin revalidar aquí: si no, /bienvenida redirigiría antes de mostrar la pantalla final.
  return { ok: true, ts: Date.now() };
}

export async function saveRate(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({ base: z.enum(["USD", "EUR", "MXN", "GBP"]), rate: z.number().positive("Tasa no válida"), rate_date: isoDate })
    .safeParse({ base: str(fd, "base"), rate: amountOf(fd, "rate"), rate_date: str(fd, "rate_date") });
  if (!parsed.success) return zodFail(parsed.error);
  const { supabase, userId } = await getContext();
  const { error } = await supabase
    .from("exchange_rates")
    .upsert({ ...parsed.data, quote: "COP", user_id: userId, source: "manual" }, { onConflict: "user_id,base,quote,rate_date" });
  return error ? dbError(error) : done("Tasa guardada");
}

export async function deleteRate(id: string): Promise<ActionState> {
  if (!uuid.safeParse(id).success) return fail("Tasa no válida");
  const { supabase } = await getContext();
  const { error } = await supabase.from("exchange_rates").delete().eq("id", id);
  return error ? dbError(error) : done("Tasa eliminada");
}
