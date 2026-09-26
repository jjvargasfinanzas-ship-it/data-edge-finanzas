-- =====================================================================
-- Data Edge Finanzas · Obligaciones y paletas
--
-- Obligaciones: deudas y compromisos de pago (créditos, impuestos, servicios,
-- deudas con personas…) con valor original, cuotas, periodicidad y pagos.
--
--   * Cada pago es un movimiento real (gasto) con obligation_id. Así el saldo
--     de la cuenta y el flujo de caja real se actualizan solos.
--   * Si la obligación tiene "cuenta de pago", se crea un programado vinculado
--     (planned_item_id) y sus cuotas aparecen en el flujo proyectado y el
--     calendario. Un pago confirmado desde el flujo también cuenta para la
--     obligación (trigger transactions_link_obligation).
--   * El saldo pendiente y el estado (al día, por vencer, vencida, pagada) se
--     calculan en la app a partir de las cuotas y los pagos.
-- =====================================================================

create type public.obligation_kind as enum (
  'bank_loan',      -- Crédito bancario / libre inversión
  'mortgage',       -- Crédito hipotecario / vivienda
  'vehicle',        -- Crédito de vehículo
  'personal',       -- Deuda con una persona
  'tax',            -- Impuestos
  'service',        -- Servicios / suscripciones
  'education',      -- Educación
  'health',         -- Salud
  'rent',           -- Arriendo
  'other'
);

create table public.obligations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid()
                       references public.profiles (id) on delete cascade,
  creditor           text not null check (char_length(creditor) between 1 and 80),
  creditor_type      text not null default 'entity' check (creditor_type in ('person', 'entity')),
  kind               public.obligation_kind not null default 'other',
  concept            text not null check (char_length(concept) between 1 and 120),
  currency           public.currency_code not null default 'COP',
  original_amount    numeric(18, 2) not null check (original_amount > 0),
  -- Valor de cada cuota. Nulo = valor original / número de cuotas.
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
  foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete set null (category_id),
  foreign key (planned_item_id, user_id)
    references public.planned_items (id, user_id) on delete set null (planned_item_id),
  check (frequency <> 'once' or installments = 1)
);

create index obligations_user_idx on public.obligations (user_id, status, first_due_date);
create index obligations_account_idx on public.obligations (account_id);
create index obligations_category_idx on public.obligations (category_id);
create index obligations_planned_idx on public.obligations (planned_item_id);

create trigger obligations_updated_at before update on public.obligations
  for each row execute function public.set_updated_at();
create trigger obligations_audit after insert or update or delete on public.obligations
  for each row execute function public.write_audit_log();

alter table public.obligations enable row level security;

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

-- Pagos: movimientos (gastos) vinculados a la obligación
alter table public.transactions add column if not exists obligation_id uuid;
alter table public.transactions
  add constraint transactions_obligation_fk
  foreign key (obligation_id, user_id)
  references public.obligations (id, user_id) on delete set null (obligation_id);
create index if not exists transactions_obligation_idx on public.transactions (obligation_id, date);

-- Un pago confirmado desde el flujo de caja (programado vinculado) también
-- se registra como pago de la obligación.
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
  return new;
end;
$$;

revoke execute on function public.link_transaction_obligation() from public, anon, authenticated;

create trigger transactions_link_obligation
  before insert or update of planned_item_id on public.transactions
  for each row execute function public.link_transaction_obligation();

-- ---------------------------------------------------------------------
-- Paletas: Actual (data-edge), Rosado y Clásico
-- ---------------------------------------------------------------------
update public.profiles
set theme = 'data-edge'
where theme not in ('data-edge', 'rosado', 'clasico');

alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles
  add constraint profiles_theme_check check (theme in ('data-edge', 'rosado', 'clasico'));
