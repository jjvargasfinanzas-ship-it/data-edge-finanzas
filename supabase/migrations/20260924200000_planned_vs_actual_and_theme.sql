-- =====================================================================
-- Data Edge Finanzas · Bloque 1.1
-- Programado vs. real: varios pagos por ocurrencia (parciales),
-- estado manual de ocurrencias (cerrada / omitida), tema de color
-- y categoría de ingreso "Pensión".
-- =====================================================================

-- 1. Una ocurrencia programada puede recibirse en varios pagos (parciales)
alter table public.transactions
  drop constraint if exists transactions_planned_item_id_planned_date_key;

create index if not exists transactions_planned_occ_idx
  on public.transactions (planned_item_id, planned_date);

-- 2. Estado manual de una ocurrencia
--    closed  = se da por completa aunque lo recibido/pagado sea distinto
--    skipped = no ocurrirá (se omite este mes)
create table if not exists public.planned_occurrence_status (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid()
                    references public.profiles (id) on delete cascade,
  planned_item_id uuid not null,
  planned_date    date not null,
  status          text not null check (status in ('closed', 'skipped')),
  note            text check (char_length(note) <= 200),
  created_at      timestamptz not null default now(),
  unique (planned_item_id, planned_date),
  foreign key (planned_item_id, user_id)
    references public.planned_items (id, user_id) on delete cascade
);

create index if not exists planned_occurrence_status_user_idx
  on public.planned_occurrence_status (user_id, planned_date);
create index if not exists planned_occurrence_status_fk_idx
  on public.planned_occurrence_status (planned_item_id, user_id);

alter table public.planned_occurrence_status enable row level security;

create policy "planned_occurrence_status_select_own" on public.planned_occurrence_status
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "planned_occurrence_status_insert_own" on public.planned_occurrence_status
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "planned_occurrence_status_update_own" on public.planned_occurrence_status
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "planned_occurrence_status_delete_own" on public.planned_occurrence_status
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.planned_occurrence_status from anon;
grant select, insert, update, delete on public.planned_occurrence_status to authenticated;

-- 3. Paleta de color elegida por el usuario
alter table public.profiles
  add column if not exists theme text not null default 'data-edge'
  check (theme in ('data-edge', 'oceano', 'esmeralda', 'violeta', 'grafito', 'vino'));

-- 4. Categorías de ingreso: "Rentas" pasa a "Arriendos" y se agrega "Pensión"
update public.categories c
set name = 'Arriendos'
where c.kind = 'income' and c.name = 'Rentas' and c.parent_id is null
  and not exists (
    select 1 from public.categories x
    where x.user_id = c.user_id and x.kind = 'income' and x.name = 'Arriendos' and x.parent_id is null
  );

insert into public.categories (user_id, kind, name, icon, color, sort_order)
select p.id, 'income', 'Pensión', 'landmark', '#0EA5E9', 24
from public.profiles p
on conflict do nothing;

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
      ('income',  'Arriendos',       'building',      '#22C55E', array[]::text[]),
      ('income',  'Pensión',         'landmark',      '#0EA5E9', array[]::text[]),
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
