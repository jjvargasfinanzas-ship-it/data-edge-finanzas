-- =====================================================================
-- Data Edge Finanzas · Obligaciones financieras y paletas
--
-- Se puede ejecutar varias veces sin error: crea lo que falte y no toca
-- lo que ya existe.
--
-- Obligaciones: deudas y compromisos de pago (créditos, impuestos, deudas
-- con personas…) con valor original, cuotas, periodicidad y pagos.
--
--   * Las obligaciones NO son ingresos ni gastos. Tienen su propia
--     clasificación (obligation_categories): "Obligaciones financieras"
--     con subcategorías por tipo de acreedor.
--   * Cada pago es un movimiento con obligation_id y SIN categoría de gasto:
--     baja el saldo de la cuenta y el flujo de caja real, pero no entra a
--     los análisis de ingresos y gastos.
--   * Si la obligación tiene cuenta de pago, un programado vinculado lleva
--     sus cuotas al flujo proyectado y al calendario.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.obligation_kind as enum (
    'bank_loan', 'mortgage', 'vehicle', 'personal', 'tax',
    'service', 'education', 'health', 'rent', 'other'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 2. Clasificación de obligaciones (independiente de ingresos y gastos)
--    Categoría principal: Obligaciones financieras. Estas son sus subcategorías.
-- ---------------------------------------------------------------------
create table if not exists public.obligation_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  icon        text,
  sort_order  integer not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create index if not exists obligation_categories_user_idx
  on public.obligation_categories (user_id, is_archived, sort_order);

drop trigger if exists obligation_categories_updated_at on public.obligation_categories;
create trigger obligation_categories_updated_at before update on public.obligation_categories
  for each row execute function public.set_updated_at();

alter table public.obligation_categories enable row level security;
drop policy if exists "obligation_categories_select_own" on public.obligation_categories;
drop policy if exists "obligation_categories_insert_own" on public.obligation_categories;
drop policy if exists "obligation_categories_update_own" on public.obligation_categories;
drop policy if exists "obligation_categories_delete_own" on public.obligation_categories;
create policy "obligation_categories_select_own" on public.obligation_categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "obligation_categories_insert_own" on public.obligation_categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "obligation_categories_update_own" on public.obligation_categories
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "obligation_categories_delete_own" on public.obligation_categories
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.obligation_categories from anon;
grant select, insert, update, delete on public.obligation_categories to authenticated;

create or replace function public.seed_obligation_categories(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.obligation_categories (user_id, name, icon, sort_order)
  values
    (p_user_id, 'Entidades financieras',        'landmark',      1),
    (p_user_id, 'Establecimientos de comercio', 'store',         2),
    (p_user_id, 'Personas naturales',           'user',          3),
    (p_user_id, 'Empresas',                     'building',      4),
    (p_user_id, 'Tarjetas de crédito',          'credit-card',   5),
    (p_user_id, 'Otros',                        'circle-dashed', 6)
  on conflict (user_id, name) do nothing;
$$;
revoke execute on function public.seed_obligation_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_profile_obligations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_obligation_categories(new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_profile_obligations() from public, anon, authenticated;

drop trigger if exists on_profile_created_obligations on public.profiles;
create trigger on_profile_created_obligations after insert on public.profiles
  for each row execute function public.handle_new_profile_obligations();

-- Usuarios existentes
select public.seed_obligation_categories(id) from public.profiles;

-- ---------------------------------------------------------------------
-- 3. Obligaciones
-- ---------------------------------------------------------------------
create table if not exists public.obligations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid()
                       references public.profiles (id) on delete cascade,
  creditor           text not null check (char_length(creditor) between 1 and 80),
  creditor_type      text not null default 'entity' check (creditor_type in ('person', 'entity')),
  kind               public.obligation_kind not null default 'other',
  concept            text not null check (char_length(concept) between 1 and 120),
  currency           public.currency_code not null default 'COP',
  original_amount    numeric(18, 2) not null check (original_amount > 0),
  installment_amount numeric(18, 2) check (installment_amount > 0),
  installments       smallint not null default 1 check (installments between 1 and 600),
  frequency          public.frequency not null default 'monthly',
  first_due_date     date not null,
  interest_rate      numeric(7, 4) check (interest_rate >= 0 and interest_rate <= 1000),
  account_id         uuid,
  category_id        uuid,
  planned_item_id    uuid,
  status             text not null default 'active' check (status in ('active', 'cancelled')),
  notes              text check (char_length(notes) <= 500),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete set null (account_id),
  foreign key (planned_item_id, user_id)
    references public.planned_items (id, user_id) on delete set null (planned_item_id),
  check (frequency <> 'once' or installments = 1)
);

-- Clasificación del acreedor
alter table public.obligations add column if not exists class_id uuid;
do $$ begin
  alter table public.obligations
    add constraint obligations_class_fk foreign key (class_id, user_id)
    references public.obligation_categories (id, user_id) on delete set null (class_id);
exception when duplicate_object then null;
end $$;

create index if not exists obligations_user_idx on public.obligations (user_id, status, first_due_date);
create index if not exists obligations_account_idx on public.obligations (account_id);
create index if not exists obligations_planned_idx on public.obligations (planned_item_id);
create index if not exists obligations_class_idx on public.obligations (class_id);

drop trigger if exists obligations_updated_at on public.obligations;
create trigger obligations_updated_at before update on public.obligations
  for each row execute function public.set_updated_at();
drop trigger if exists obligations_audit on public.obligations;
create trigger obligations_audit after insert or update or delete on public.obligations
  for each row execute function public.write_audit_log();

alter table public.obligations enable row level security;
drop policy if exists "obligations_select_own" on public.obligations;
drop policy if exists "obligations_insert_own" on public.obligations;
drop policy if exists "obligations_update_own" on public.obligations;
drop policy if exists "obligations_delete_own" on public.obligations;
create policy "obligations_select_own" on public.obligations
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "obligations_insert_own" on public.obligations
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "obligations_update_own" on public.obligations
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "obligations_delete_own" on public.obligations
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.obligations from anon;
grant select, insert, update, delete on public.obligations to authenticated;

-- Clasificar las obligaciones que ya existan
update public.obligations o
set class_id = c.id
from public.obligation_categories c
where o.class_id is null
  and c.user_id = o.user_id
  and c.name = case when o.creditor_type = 'person' then 'Personas naturales' else 'Entidades financieras' end;

-- ---------------------------------------------------------------------
-- 4. Pagos: movimientos vinculados a la obligación
-- ---------------------------------------------------------------------
alter table public.transactions add column if not exists obligation_id uuid;
do $$ begin
  alter table public.transactions
    add constraint transactions_obligation_fk foreign key (obligation_id, user_id)
    references public.obligations (id, user_id) on delete set null (obligation_id);
exception when duplicate_object then null;
end $$;
create index if not exists transactions_obligation_idx on public.transactions (obligation_id, date);

-- Un pago confirmado desde el flujo de caja también cuenta para la obligación
-- y no lleva categoría de gasto.
create or replace function public.link_transaction_obligation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.obligation_id is null and new.planned_item_id is not null then
    select o.id into new.obligation_id
    from public.obligations o
    where o.planned_item_id = new.planned_item_id and o.user_id = new.user_id
    limit 1;
  end if;
  if new.obligation_id is not null then
    new.category_id := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.link_transaction_obligation() from public, anon, authenticated;

drop trigger if exists transactions_link_obligation on public.transactions;
create trigger transactions_link_obligation
  before insert or update of planned_item_id, obligation_id, category_id on public.transactions
  for each row execute function public.link_transaction_obligation();

-- Las obligaciones dejan de usar categorías de gasto
update public.obligations set category_id = null where category_id is not null;
update public.planned_items p set category_id = null
from public.obligations o
where o.planned_item_id = p.id and p.category_id is not null;
update public.transactions set category_id = null
where obligation_id is not null and category_id is not null;

-- ---------------------------------------------------------------------
-- 5. Paletas: la app valida el nombre; aquí solo el formato.
--    (La restricción anterior rechazaba las paletas nuevas: por eso la
--    selección no se guardaba y volvía a la predeterminada.)
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles drop constraint if exists profiles_theme_format;
update public.profiles
set theme = 'data-edge'
where theme not in ('data-edge', 'rosado', 'clasico', 'vino', 'salvia', 'arena');
alter table public.profiles
  add constraint profiles_theme_format check (theme ~ '^[a-z-]{2,30}$');
