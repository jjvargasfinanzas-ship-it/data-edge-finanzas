/**
 * Backend simulado SOLO para pruebas locales (DE_FAKE_BACKEND=1).
 * Reemplaza @supabase/ssr con un almacén en memoria que imita el subconjunto
 * de PostgREST que usa la app. Nunca se incluye en builds normales.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const USER = "00000000-0000-4000-8000-000000000001";
const now = () => new Date().toISOString();
let seq = 1000;
const uuid = () => `00000000-0000-4000-9000-${String(++seq).padStart(12, "0")}`;

function seed() {
  const db: Record<string, Row[]> = {
    profiles: [], accounts: [], categories: [], planned_items: [], transactions: [], calendar_events: [], exchange_rates: [], audit_logs: [], planned_occurrence_status: [],
  };
  const onboarded = process.env.DE_FAKE_ONBOARDED !== "0";
  db.profiles.push({
    id: USER, first_name: "Juan", last_name: "Vargas", email: "juan@ejemplo.co", country: "CO", city: "Medellín", base_currency: "COP",
    timezone: "America/Bogota", avatar_url: null, theme: process.env.DE_FAKE_THEME ?? "data-edge", main_goal: onboarded ? "organize_expenses" : null,
    onboarding_completed_at: onboarded ? now() : null, status: "active", created_at: "2026-09-01T12:00:00Z", updated_at: now(),
  });
  const cat = (kind: string, name: string, icon: string, color: string, parent: string | null = null, order = 0) => {
    const r = { id: uuid(), user_id: USER, kind, name, parent_id: parent, icon, color, is_archived: false, sort_order: order, created_at: now(), updated_at: now() };
    db.categories.push(r);
    return r.id;
  };
  const viv = cat("expense", "Vivienda", "home", "#2563EB", null, 1);
  const arr = cat("expense", "Arriendo", "home", "#2563EB", viv);
  const ali = cat("expense", "Alimentación", "utensils", "#16A34A", null, 2);
  const mer = cat("expense", "Mercado", "utensils", "#16A34A", ali);
  const res = cat("expense", "Restaurantes", "utensils", "#16A34A", ali);
  const tra = cat("expense", "Transporte", "car", "#0891B2", null, 3);
  const ser = cat("expense", "Servicios", "plug", "#CA8A04", null, 4);
  const ene = cat("expense", "Energía", "plug", "#CA8A04", ser);
  const sus = cat("expense", "Suscripciones", "repeat", "#4F46E5", null, 5);
  const sal = cat("expense", "Salud", "heart-pulse", "#DC2626", null, 6);
  const ent = cat("expense", "Entretenimiento", "popcorn", "#DB2777", null, 7);
  cat("expense", "Educación", "graduation-cap", "#7C3AED", null, 8);
  cat("expense", "Otros gastos", "circle-dashed", "#64748B", null, 9);
  const salario = cat("income", "Salario", "briefcase", "#14B8A6", null, 20);
  const hon = cat("income", "Honorarios", "file-signature", "#0D9488", null, 21);
  cat("income", "Pensión", "landmark", "#0EA5E9", null, 22);

  const acc = (name: string, type: string, bal: number, extra: Row = {}) => {
    const r = {
      id: uuid(), user_id: USER, name, type, institution: extra.institution ?? null, currency: extra.currency ?? "COP", opening_balance: bal,
      opening_date: "2026-08-01", color: null, include_in_net_worth: true, is_archived: false, sort_order: 0, credit_limit: null,
      statement_day: null, due_day: null, created_at: now(), updated_at: now(), ...extra,
    };
    db.accounts.push(r);
    return r.id;
  };
  const efectivo = acc("Efectivo", "cash", 150000);
  const banco = acc("Ahorros Bancolombia", "bank_savings", 3500000, { institution: "Bancolombia" });
  const nequi = acc("Nequi", "digital_wallet", 280000);
  const usd = acc("Cuenta USD", "bank_savings", 1200, { currency: "USD", institution: "Global66" });
  const visa = acc("Visa Oro", "credit_card", -1200000, { institution: "Davivienda", credit_limit: 6000000, statement_day: 20, due_day: 5 });
  const inv = acc("Fondo de inversión", "investment", 8000000);

  if (onboarded) {
    const tx = (date: string, kind: string, amount: number, account_id: string, extra: Row = {}) =>
      db.transactions.push({ id: uuid(), user_id: USER, kind, date, amount, account_id, to_account_id: null, to_amount: null, category_id: null, description: null, notes: null, planned_item_id: null, planned_date: null, created_at: now(), updated_at: now(), ...extra });
    // agosto
    tx("2026-08-01", "expense", 2000000, banco, { category_id: arr, description: "Arriendo agosto" });
    tx("2026-08-03", "expense", 420000, banco, { category_id: mer, description: "Mercado" });
    tx("2026-08-10", "expense", 95000, visa, { category_id: res });
    tx("2026-08-12", "expense", 180000, nequi, { category_id: ene, description: "EPM" });
    tx("2026-08-15", "income", 1200000, banco, { category_id: hon, description: "Honorarios consultoría" });
    tx("2026-08-20", "expense", 60000, efectivo, { category_id: tra });
    tx("2026-08-30", "income", 7800000, banco, { category_id: salario, description: "Salario agosto" });
    // septiembre
    tx("2026-09-01", "expense", 2000000, banco, { category_id: arr, description: "Arriendo septiembre" });
    tx("2026-09-04", "expense", 510000, banco, { category_id: mer, description: "Mercado del mes" });
    tx("2026-09-06", "expense", 45000, visa, { category_id: sus, description: "Netflix" });
    tx("2026-09-09", "expense", 160000, visa, { category_id: res, description: "Cena cumpleaños" });
    tx("2026-09-12", "expense", 190000, nequi, { category_id: ene, description: "EPM" });
    tx("2026-09-14", "expense", 85000, efectivo, { category_id: tra, description: "Taxis" });
    tx("2026-09-15", "income", 1500000, banco, { category_id: hon, description: "Honorarios consultoría" });
    tx("2026-09-18", "expense", 230000, visa, { category_id: sal, description: "Consulta médica" });
    tx("2026-09-20", "expense", 120000, visa, { category_id: ent, description: "Cine y salida" });
    tx("2026-09-21", "transfer", 500000, banco, { to_account_id: nequi, description: "Recarga Nequi" });
    tx("2026-09-22", "transfer", 1000000, banco, { to_account_id: inv, description: "Aporte fondo" });

    const pl = (name: string, kind: string, amount: number, account_id: string, start_date: string, extra: Row = {}) => {
      const id = uuid();
      db.planned_items.push({ id, user_id: USER, name, kind, amount, account_id, to_account_id: null, category_id: null, frequency: "monthly", start_date, end_date: null, is_active: true, notes: null, created_at: "2026-08-25T12:00:00Z", updated_at: now(), ...extra });
      return id;
    };
    const salP = pl("Salario", "income", 8000000, banco, "2026-01-30", { category_id: salario });
    const arrP = pl("Arriendo", "expense", 2000000, banco, "2026-01-01", { category_id: arr });
    const hon2 = pl("Honorarios consultoría", "income", 1500000, banco, "2026-01-15", { category_id: hon });
    const pen = pl("Arriendo local (recibo)", "income", 1200000, banco, "2026-01-05", { category_id: hon, end_date: "2027-06-30" });
    pl("Energía EPM", "expense", 190000, nequi, "2026-01-12", { category_id: ene });
    pl("Internet", "expense", 95000, banco, "2026-01-18", { category_id: ser });
    pl("Netflix", "expense", 45000, visa, "2026-01-06", { category_id: sus });
    pl("Aporte fondo", "transfer", 500000, banco, "2026-01-10", { to_account_id: inv });
    pl("Seguro vehículo", "expense", 1850000, banco, "2026-10-28", { frequency: "yearly", category_id: sal });
    // Vincular movimientos reales a sus programados (septiembre)
    const link = (desc: string, pid: string, date: string) => {
      const t = db.transactions.find((x) => x.description === desc && x.date.startsWith("2026-09"));
      if (t) Object.assign(t, { planned_item_id: pid, planned_date: date });
    };
    link("Arriendo septiembre", arrP, "2026-09-01");
    const ago = db.transactions.find((x) => x.description === "Salario agosto");
    if (ago) Object.assign(ago, { planned_item_id: salP, planned_date: "2026-08-30" });
    link("Honorarios consultoría", hon2, "2026-09-15");
    // Honorarios de sept: se recibieron 1.500.000 completos; arriendo del local: parcial
    db.transactions.push({ id: uuid(), user_id: USER, kind: "income", date: "2026-09-06", amount: 1000000, account_id: banco, to_account_id: null, to_amount: null, category_id: hon, description: "Arriendo local", notes: null, planned_item_id: pen, planned_date: "2026-09-05", created_at: now(), updated_at: now() });
    const ev = (title: string, event_type: string, event_date: string, frequency = "once") =>
      db.calendar_events.push({ id: uuid(), user_id: USER, title, event_type, event_date, event_time: null, frequency, end_date: null, remind_days_before: 0, notes: null, created_at: now(), updated_at: now() });
    ev("Cumpleaños María", "birthday", "1990-10-02", "yearly");
    ev("Cita odontólogo", "appointment", "2026-09-29");
    ev("Declaración de renta", "reminder", "2026-10-14");
  }
  db.exchange_rates.push(
    { id: uuid(), user_id: null, base: "USD", quote: "COP", rate: 3208.66, rate_date: "2026-09-23", source: "trm", created_at: now() },
    { id: uuid(), user_id: null, base: "EUR", quote: "COP", rate: 3657.13, rate_date: "2026-09-23", source: "trm", created_at: now() },
  );
  return db;
}

const G = globalThis as any;
const store = (): Record<string, Row[]> => (G.__deFake ??= seed());

function balances(): Row[] {
  const db = store();
  return db.accounts.map((a) => {
    let b = Number(a.opening_balance);
    for (const t of db.transactions) {
      if (t.account_id === a.id) b += t.kind === "income" ? Number(t.amount) : -Number(t.amount);
      if (t.to_account_id === a.id) b += Number(t.to_amount ?? t.amount);
    }
    return { account_id: a.id, user_id: a.user_id, balance: b };
  });
}

function parseOr(expr: string) {
  return expr.split(",").map((p) => {
    const [col, op, ...rest] = p.split(".");
    return { col, op, val: rest.join(".") };
  });
}

class Query {
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private rng: [number, number] | null = null;
  private lim: number | null = null;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private countMode = false;
  private head = false;
  private one: "single" | "maybe" | null = null;
  private returning = false;
  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode !== "select") this.returning = true;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(p: any) { this.mode = "insert"; this.payload = p; return this; }
  private conflict: string[] = [];
  upsert(p: any, o?: { onConflict?: string }) { this.mode = "upsert"; this.payload = p; this.conflict = o?.onConflict?.split(",") ?? []; return this; }
  update(p: any) { this.mode = "update"; this.payload = p; return this; }
  delete() { this.mode = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  is(c: string, v: any) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(r[c])); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] >= v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] <= v); return this; }
  not(c: string, op: string, v: any) { if (op === "is" && v === null) this.filters.push((r) => r[c] != null); return this; }
  ilike(c: string, pat: string) { const s = pat.replace(/%/g, "").toLowerCase(); this.filters.push((r) => String(r[c] ?? "").toLowerCase().includes(s)); return this; }
  or(expr: string) { const cs = parseOr(expr); this.filters.push((r) => cs.some((x) => x.op === "eq" && String(r[x.col]) === x.val)); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  range(a: number, b: number) { this.rng = [a, b]; return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }

  private rows(): Row[] {
    if (this.table === "account_balances") return balances();
    return (store()[this.table] ??= []);
  }

  private defaults(r: Row): Row {
    const base: Row = { id: uuid(), user_id: USER, created_at: now(), updated_at: now() };
    const t: Record<string, Row> = {
      accounts: { institution: null, currency: "COP", opening_balance: 0, opening_date: "2026-09-24", color: null, include_in_net_worth: true, is_archived: false, sort_order: 0, credit_limit: null, statement_day: null, due_day: null },
      transactions: { to_account_id: null, to_amount: null, category_id: null, description: null, notes: null, planned_item_id: null, planned_date: null, date: "2026-09-24" },
      planned_items: { to_account_id: null, category_id: null, frequency: "monthly", end_date: null, is_active: true, notes: null },
      categories: { parent_id: null, icon: null, color: null, is_archived: false, sort_order: 99 },
      calendar_events: { event_time: null, frequency: "once", end_date: null, remind_days_before: 0, notes: null },
      exchange_rates: { source: "manual" },
    };
    return { ...base, ...(t[this.table] ?? {}), ...r };
  }

  private exec() {
    const all = this.rows();
    let error: any = null;
    let data: any;
    let count: number | null = null;
    if (this.mode === "insert" || this.mode === "upsert") {
      if (this.mode === "upsert" && this.conflict.length) {
        const raw = Array.isArray(this.payload) ? this.payload : [this.payload];
        const rest: Row[] = [];
        for (const r of raw) {
          const hit = all.find((x) => this.conflict.every((c) => (x[c] ?? null) === (r[c] ?? null) || (c === "user_id" && r[c] === undefined)));
          if (hit) Object.assign(hit, r);
          else rest.push(r);
        }
        this.payload = rest;
      }
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => this.defaults(r));
      if (this.table === "transactions") {
        for (const it of items) {
          if (it.planned_item_id && all.some((x) => x.planned_item_id === it.planned_item_id && x.planned_date === it.planned_date))
            return { data: null, error: { code: "23505", message: "duplicate" }, count };
        }
      }
      all.push(...items);
      data = this.returning ? items : null;
    } else if (this.mode === "update") {
      const hit = all.filter((r) => this.filters.every((f) => f(r)));
      hit.forEach((r) => Object.assign(r, this.payload, { updated_at: now() }));
      data = this.returning ? hit : null;
    } else if (this.mode === "delete") {
      const keep = all.filter((r) => !this.filters.every((f) => f(r)));
      const removed = all.length - keep.length;
      all.splice(0, all.length, ...keep);
      data = null;
      void removed;
    } else {
      let out = all.filter((r) => this.filters.every((f) => f(r)));
      for (const o of [...this.orders].reverse()) {
        out = [...out].sort((a, b) => (a[o.col] === b[o.col] ? 0 : (a[o.col] > b[o.col] ? 1 : -1) * (o.asc ? 1 : -1)));
      }
      count = out.length;
      if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
      if (this.lim !== null) out = out.slice(0, this.lim);
      data = this.head ? null : out.map((r) => ({ ...r }));
    }
    if (this.one) {
      const arr = Array.isArray(data) ? data : [];
      if (this.one === "single" && arr.length !== 1) error = { code: "PGRST116", message: "not single" };
      data = arr[0] ?? null;
    }
    return { data, error, count: this.countMode ? count : null };
  }

  then(res: (v: any) => any, rej?: (e: any) => any) {
    try {
      return Promise.resolve(this.exec()).then(res, rej);
    } catch (e) {
      return Promise.reject(e).then(res, rej);
    }
  }
}

function client() {
  return {
    from: (t: string) => new Query(t),
    auth: {
      getClaims: async () => ({ data: { claims: { sub: USER } }, error: null }),
      getUser: async () => ({ data: { user: { id: USER } }, error: null }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      updateUser: async () => ({ error: null }),
      verifyOtp: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ error: null }),
      signInWithOAuth: async () => ({ data: { url: null }, error: { message: "fake" } }),
    },
  };
}

export const createServerClient = (..._a: any[]) => client();
export const createBrowserClient = (..._a: any[]) => client();
