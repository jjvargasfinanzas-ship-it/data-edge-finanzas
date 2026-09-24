-- =====================================================================
-- Data Edge Finanzas · Bloque 1
-- Núcleo: perfiles, cuentas (incluye tarjetas), categorías, movimientos,
-- programados (base del flujo de caja futuro), calendario, tasas de cambio
-- y auditoría.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.currency_code as enum ('COP', 'USD', 'EUR', 'MXN', 'GBP');

create type public.account_type as enum (
  'bank_savings',     -- Cuenta de ahorros
  'bank_checking',    -- Cuenta corriente
  'cash',             -- Efectivo
  'digital_wallet',   -- Billetera digital (Nequi, Daviplata…)
  'investment',       -- Cuenta de inversión
  'credit_card',      -- Tarjeta de crédito (pasivo)
  'other'
);

create type public.category_kind as enum ('income', 'expense');

create type public.transaction_kind as enum ('income', 'expense', 'transfer');

create type public.frequency as enum (
  'once',        -- Único
  'weekly',      -- Semanal
  'biweekly',    -- Cada 14 días
  'semimonthly', -- Quincenal (día 15 y último día del mes)
  'monthly',     -- Mensual
  'bimonthly',   -- Bimestral
  'quarterly',   -- Trimestral
  'semiannual',  -- Semestral
  'yearly'       -- Anual
);

create type public.event_type as enum (
  'birthday', 'appointment', 'activity', 'reminder', 'other'
);

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfiles (cuenta Data Edge)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  first_name              text check (char_length(first_name) <= 80),
  last_name               text check (char_length(last_name) <= 80),
  email                   text,
  country                 text not null default 'CO',
  city                    text,
  base_currency           public.currency_code not null default 'COP',
  timezone                text not null default 'America/Bogota',
  avatar_url              text,
  main_goal               text check (main_goal in (
                            'organize_expenses', 'save_more', 'get_out_of_debt',
                            'family_finances', 'start_investing', 'build_wealth',
                            'plan_goal')),
  onboarding_completed_at timestamptz,
  status                  text not null default 'active'
                            check (status in ('active', 'suspended', 'deleted')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Cuentas (bancos, efectivo, billeteras, inversión y tarjetas de crédito)
-- Para tarjetas, el saldo es negativo cuando hay deuda.
-- ---------------------------------------------------------------------
create table public.accounts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid()
                         references public.profiles (id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 80),
  type                 public.account_type not null,
  institution          text check (char_length(institution) <= 80),
  currency             public.currency_code not null default 'COP',
  opening_balance      numeric(18, 2) not null default 0,
  opening_date         date not null default current_date,
  color                text,
  include_in_net_worth boolean not null default true,
  is_archived          boolean not null default false,
  sort_order           integer not null default 0,
  -- Solo tarjetas de crédito
  credit_limit         numeric(18, 2) check (credit_limit >= 0),
  statement_day        smallint check (statement_day between 1 and 31),
  due_day              smallint check (due_day between 1 and 31),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, user_id),
  constraint accounts_credit_card_fields check (
    type <> 'credit_card'
    or (credit_limit is not null and statement_day is not null and due_day is not null)
  )
);

create index accounts_user_idx on public.accounts (user_id, is_archived, sort_order);

create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Categorías (con subcategorías, un nivel)
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references public.profiles (id) on delete cascade,
  kind        public.category_kind not null,
  name        text not null check (char_length(name) between 1 and 60),
  parent_id   uuid,
  icon        text,
  color       text,
  is_archived boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, kind),
  unique nulls not distinct (user_id, kind, parent_id, name),
  -- El padre debe ser del mismo usuario y del mismo tipo
  foreign key (parent_id, user_id, kind)
    references public.categories (id, user_id, kind) on delete cascade,
  check (parent_id is null or parent_id <> id)
);

create index categories_user_idx on public.categories (user_id, kind, is_archived);
create index categories_parent_idx on public.categories (parent_id);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Programados: ingresos, gastos, pagos y transferencias esperados.
-- Son la fuente del flujo de caja futuro y del calendario financiero.
-- ---------------------------------------------------------------------
create table public.planned_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  kind          public.transaction_kind not null,
  name          text not null check (char_length(name) between 1 and 80),
  amount        numeric(18, 2) not null check (amount > 0),
  account_id    uuid not null,
  to_account_id uuid,
  category_id   uuid,
  frequency     public.frequency not null default 'monthly',
  start_date    date not null,
  end_date      date,
  is_active     boolean not null default true,
  notes         text check (char_length(notes) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete cascade,
  foreign key (to_account_id, user_id)
    references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  check ((kind = 'transfer') = (to_account_id is not null)),
  check (to_account_id is null or to_account_id <> account_id),
  check (end_date is null or end_date >= start_date)
);

create index planned_items_user_idx on public.planned_items (user_id, is_active);
create index planned_items_account_idx on public.planned_items (account_id);
create index planned_items_to_account_idx on public.planned_items (to_account_id);
create index planned_items_category_idx on public.planned_items (category_id);

create trigger planned_items_updated_at before update on public.planned_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Movimientos reales
-- Transferencia: sale de account_id y entra a to_account_id.
-- to_amount solo cuando las cuentas tienen moneda distinta.
-- ---------------------------------------------------------------------
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                    references public.profiles (id) on delete cascade,
  kind            public.transaction_kind not null,
  date            date not null default current_date,
  amount          numeric(18, 2) not null check (amount > 0),
  account_id      uuid not null,
  to_account_id   uuid,
  to_amount       numeric(18, 2) check (to_amount > 0),
  category_id     uuid,
  description     text check (char_length(description) <= 140),
  notes           text check (char_length(notes) <= 500),
  planned_item_id uuid,
  planned_date    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete cascade,
  foreign key (to_account_id, user_id)
    references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  foreign key (planned_item_id, user_id)
    references public.planned_items (id, user_id) on delete set null (planned_item_id),
  check ((kind = 'transfer') = (to_account_id is not null)),
  check (to_account_id is null or to_account_id <> account_id),
  check (to_amount is null or kind = 'transfer'),
  check ((planned_item_id is null) or (planned_date is not null)),
  -- Cada ocurrencia de un programado se registra una sola vez
  unique (planned_item_id, planned_date)
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_date_idx on public.transactions (account_id, date);
create index transactions_to_account_idx on public.transactions (to_account_id);
create index transactions_category_idx on public.transactions (category_id);

create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Eventos de calendario no financieros (cumpleaños, citas, actividades…)
-- ---------------------------------------------------------------------
create table public.calendar_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid()
                       references public.profiles (id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 100),
  event_type         public.event_type not null default 'reminder',
  event_date         date not null,
  event_time         time,
  frequency          public.frequency not null default 'once',
  end_date           date,
  remind_days_before smallint not null default 0 check (remind_days_before between 0 and 60),
  notes              text check (char_length(notes) <= 500),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (end_date is null or end_date >= event_date)
);

create index calendar_events_user_idx on public.calendar_events (user_id, event_date);

create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Tasas de cambio: 1 unidad de `base` = `rate` unidades de `quote`.
-- user_id nulo = tasa global (la escribe el proceso automático).
-- user_id del usuario = tasa manual que prevalece para ese usuario.
-- ---------------------------------------------------------------------
create table public.exchange_rates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles (id) on delete cascade,
  base       public.currency_code not null,
  quote      public.currency_code not null,
  rate       numeric(20, 8) not null check (rate > 0),
  rate_date  date not null default current_date,
  source     text not null default 'manual',
  created_at timestamptz not null default now(),
  check (base <> quote),
  unique nulls not distinct (user_id, base, quote, rate_date)
);

create index exchange_rates_lookup_idx on public.exchange_rates (base, quote, rate_date desc);

-- ---------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  table_name text not null,
  record_id  uuid,
  action     text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_user_idx on public.audit_logs (user_id, created_at desc);

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_logs (user_id, table_name, record_id, action, old_data, new_data)
  values (
    coalesce(auth.uid(), (v_row ->> 'user_id')::uuid),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

revoke execute on function public.write_audit_log() from public, anon, authenticated;

create trigger accounts_audit after insert or update or delete on public.accounts
  for each row execute function public.write_audit_log();
create trigger transactions_audit after insert or update or delete on public.transactions
  for each row execute function public.write_audit_log();
create trigger planned_items_audit after insert or update or delete on public.planned_items
  for each row execute function public.write_audit_log();
create trigger categories_audit after insert or update or delete on public.categories
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- Saldos por cuenta (respeta RLS del usuario que consulta)
-- ---------------------------------------------------------------------
create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.opening_balance
    + coalesce((
        select sum(case t.kind when 'income' then t.amount else -t.amount end)
        from public.transactions t
        where t.account_id = a.id
      ), 0)
    + coalesce((
        select sum(coalesce(t.to_amount, t.amount))
        from public.transactions t
        where t.to_account_id = a.id
      ), 0) as balance
from public.accounts a;

-- ---------------------------------------------------------------------
-- Alta de usuario: perfil + categorías base + cuenta de efectivo
-- ---------------------------------------------------------------------
create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent uuid;
  r record;
  s text;
  v_order int := 0;
begin
  for r in
    select * from (values
      ('expense', 'Vivienda',        'home',          '#2563EB', array['Arriendo','Cuota vivienda','Administración','Mantenimiento']),
      ('expense', 'Alimentación',    'utensils',      '#16A34A', array['Mercado','Restaurantes','Domicilios','Cafetería']),
      ('expense', 'Transporte',      'car',           '#0891B2', array['Combustible','Transporte público','Taxi y apps','Parqueadero','Mantenimiento vehículo','Peajes']),
      ('expense', 'Salud',           'heart-pulse',   '#DC2626', array['EPS y prepagada','Medicamentos','Consultas','Odontología']),
      ('expense', 'Educación',       'graduation-cap','#7C3AED', array['Matrículas','Cursos','Libros y útiles']),
      ('expense', 'Servicios',       'plug',          '#CA8A04', array['Energía','Agua','Gas','Internet','Celular']),
      ('expense', 'Entretenimiento', 'popcorn',       '#DB2777', array['Salidas','Eventos','Hobbies']),
      ('expense', 'Viajes',          'plane',         '#0EA5E9', array['Tiquetes','Alojamiento','Gastos de viaje']),
      ('expense', 'Familia',         'users',         '#EA580C', array['Hijos','Mascotas','Regalos']),
      ('expense', 'Compras',         'shopping-bag',  '#9333EA', array['Ropa','Hogar','Tecnología']),
      ('expense', 'Suscripciones',   'repeat',        '#4F46E5', array['Streaming','Software','Gimnasio']),
      ('expense', 'Deudas',          'landmark',      '#B91C1C', array['Intereses','Cuota de manejo','Cuotas de crédito']),
      ('expense', 'Impuestos',       'receipt',       '#57534E', array['Predial','Vehicular','Renta','GMF 4x1000']),
      ('expense', 'Seguros',         'shield',        '#0F766E', array['Vida','Vehículo','Hogar']),
      ('expense', 'Otros gastos',    'circle-dashed', '#64748B', array[]::text[]),
      ('income',  'Salario',         'briefcase',     '#14B8A6', array[]::text[]),
      ('income',  'Honorarios',      'file-signature','#0D9488', array[]::text[]),
      ('income',  'Negocio',         'store',         '#059669', array[]::text[]),
      ('income',  'Comisiones',      'percent',       '#10B981', array[]::text[]),
      ('income',  'Rentas',          'building',      '#22C55E', array[]::text[]),
      ('income',  'Inversiones',     'trending-up',   '#06B6D4', array[]::text[]),
      ('income',  'Bonificaciones',  'gift',          '#84CC16', array[]::text[]),
      ('income',  'Otros ingresos',  'circle-plus',   '#64748B', array[]::text[])
    ) as t(kind, name, icon, color, subs)
  loop
    v_order := v_order + 1;
    insert into public.categories (user_id, kind, name, icon, color, sort_order)
    values (p_user_id, r.kind::public.category_kind, r.name, r.icon, r.color, v_order)
    on conflict do nothing
    returning id into v_parent;

    if v_parent is not null then
      foreach s in array r.subs loop
        insert into public.categories (user_id, kind, name, parent_id, icon, color)
        values (p_user_id, r.kind::public.category_kind, s, v_parent, r.icon, r.color)
        on conflict do nothing;
      end loop;
    end if;
  end loop;
end;
$$;

revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name',
             split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1)),
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;

  perform public.seed_default_categories(new.id);

  insert into public.accounts (user_id, name, type, sort_order)
  values (new.id, 'Efectivo', 'cash', 99);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- Regla: cada usuario solo ve y modifica lo suyo.
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.accounts        enable row level security;
alter table public.categories      enable row level security;
alter table public.planned_items   enable row level security;
alter table public.transactions    enable row level security;
alter table public.calendar_events enable row level security;
alter table public.exchange_rates  enable row level security;
alter table public.audit_logs      enable row level security;

-- Perfiles: se crean por trigger; el usuario lee y edita el suyo.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Tablas de propiedad directa
do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'categories', 'planned_items', 'transactions', 'calendar_events']
  loop
    execute format(
      'create policy "%1$s_select_own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- Tasas: se leen las globales y las propias; solo se escriben las propias.
create policy "exchange_rates_select" on public.exchange_rates
  for select to authenticated
  using (user_id is null or (select auth.uid()) = user_id);
create policy "exchange_rates_insert_own" on public.exchange_rates
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "exchange_rates_update_own" on public.exchange_rates
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "exchange_rates_delete_own" on public.exchange_rates
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Auditoría: solo lectura de lo propio.
create policy "audit_logs_select_own" on public.audit_logs
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- Privilegios de la API: nada para anónimos.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on
  public.accounts, public.categories, public.planned_items,
  public.transactions, public.calendar_events, public.exchange_rates
  to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.audit_logs, public.account_balances to authenticated;
