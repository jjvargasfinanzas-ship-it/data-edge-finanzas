-- =====================================================================
-- Data Edge Finanzas · Bloque 1.2
-- El saldo real solo incluye movimientos con fecha hasta hoy (zona del
-- usuario). Lo futuro es proyección: vive en planned_items.
-- =====================================================================

create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.opening_balance
    + coalesce((
        select sum(case t.kind when 'income' then t.amount else -t.amount end)
        from public.transactions t
        where t.account_id = a.id
          and t.date <= (now() at time zone coalesce(p.timezone, 'America/Bogota'))::date
      ), 0)
    + coalesce((
        select sum(coalesce(t.to_amount, t.amount))
        from public.transactions t
        where t.to_account_id = a.id
          and t.date <= (now() at time zone coalesce(p.timezone, 'America/Bogota'))::date
      ), 0) as balance
from public.accounts a
join public.profiles p on p.id = a.user_id;

grant select on public.account_balances to authenticated;

-- Movimientos registrados con fecha futura (que no vienen de un programado)
-- se convierten en programados de una sola vez: aún no han ocurrido.
with future as (
  select t.*, coalesce(t.description, c.name,
           case t.kind when 'income' then 'Ingreso' when 'expense' then 'Gasto' else 'Transferencia' end) as label
  from public.transactions t
  join public.profiles p on p.id = t.user_id
  left join public.categories c on c.id = t.category_id
  where t.planned_item_id is null
    and t.date > (now() at time zone coalesce(p.timezone, 'America/Bogota'))::date
)
insert into public.planned_items (user_id, kind, name, amount, account_id, to_account_id, category_id, frequency, start_date, notes)
select user_id, kind, left(label, 80), amount, account_id, to_account_id, category_id, 'once', date,
       'Convertido automáticamente: se había registrado como movimiento con fecha futura.'
from future;

delete from public.transactions t
using public.profiles p
where p.id = t.user_id
  and t.planned_item_id is null
  and t.date > (now() at time zone coalesce(p.timezone, 'America/Bogota'))::date;
