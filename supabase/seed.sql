-- Las categorías base y la cuenta "Efectivo" se crean automáticamente
-- para cada usuario nuevo mediante el trigger on_auth_user_created.
-- Tasas iniciales globales (el cron las mantiene al día):
insert into public.exchange_rates (user_id, base, quote, rate, rate_date, source) values
  (null, 'USD', 'COP', 3208.66, '2026-09-23', 'trm-superfinanciera')
on conflict do nothing;
