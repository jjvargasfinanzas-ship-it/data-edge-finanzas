-- =====================================================================
-- Data Edge Finanzas · Préstamos
-- Un préstamo es una cuenta más:
--   loan_receivable  Préstamo que hice (me deben). Saldo positivo = por cobrar.
--   loan_payable     Préstamo que recibí (debo).  Saldo negativo = por pagar.
-- Prestar = transferencia de mi cuenta al préstamo (no es gasto).
-- Abono   = transferencia del préstamo a mi cuenta (no es ingreso).
-- Los intereses sí se registran como ingreso o gasto.
-- =====================================================================
alter type public.account_type add value if not exists 'loan_receivable';
alter type public.account_type add value if not exists 'loan_payable';

comment on column public.accounts.institution is
  'Entidad financiera; en préstamos, la persona o entidad (deudor o acreedor).';
