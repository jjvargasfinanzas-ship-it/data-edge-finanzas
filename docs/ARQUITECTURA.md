# Arquitectura · Data Edge Finanzas

## Principios

1. **Seguridad en la base de datos, no solo en la app.** Cada tabla tiene RLS: un usuario solo lee y escribe lo suyo. Las llaves foráneas compuestas `(id, user_id)` impiden, a nivel de Postgres, que un movimiento apunte a la cuenta o categoría de otro usuario.
2. **Los saldos se calculan, no se escriben.** `account_balances` (vista con `security_invoker`) = saldo inicial + movimientos. No hay saldos que se desincronicen.
3. **El futuro se proyecta desde "programados".** Los ingresos y pagos esperados viven en `planned_items`; el motor (`src/lib/cashflow.ts`) los expande por fecha. Al registrar una ocurrencia, el movimiento queda vinculado (`planned_item_id`, `planned_date`) y sale de la proyección.
4. **Cuenta Data Edge única.** `profiles` cuelga de `auth.users`; cuando existan otros productos, compartirán el mismo proyecto de autenticación (SSO) y cada producto tendrá sus tablas.

## Estructura

```
src/
  app/
    page.tsx                 Landing pública
    (auth)/                  login, registro, recuperar, nueva-clave
    auth/confirm/            Verificación de correo / OAuth / recuperación
    bienvenida/              Onboarding
    (app)/                   Área privada (layout con navegación)
      inicio/ movimientos/ cuentas/ tarjetas/ programados/
      flujo-de-caja/ calendario/ configuracion/ pronto/[modulo]
    actions/                 Server Actions (validadas con zod)
    api/cron/exchange-rates  TRM diaria (Vercel Cron)
    api/export/movimientos   Exportación CSV
  components/
    ui/                      Design system (botones, campos, tarjetas, modal…)
    app/                     Shell, acción rápida, formularios
    charts/                  Gráficos (saldo proyectado, entradas vs. salidas)
  lib/
    cashflow.ts              Motor de flujo de caja futuro (probado)
    recurrence.ts            Frecuencias y ocurrencias (probado)
    money.ts dates.ts        Formato y aritmética de dinero y fechas
    data.ts                  Lecturas del servidor (con caché por request)
    supabase/                Clientes (navegador, servidor, proxy, admin)
  proxy.ts                   Refresco de sesión y protección de rutas
supabase/migrations/         Esquema versionado
tests/                       Pruebas unitarias + backend simulado
```

## Modelo de datos (Bloque 1)

```
auth.users 1─1 profiles
profiles 1─n accounts            (incluye tarjetas: type = credit_card, saldo negativo = deuda)
profiles 1─n categories          (padre/hijo, mismo tipo)
profiles 1─n planned_items ─n─1 accounts / categories
profiles 1─n transactions  ─n─1 accounts (origen y destino) / categories / planned_items
profiles 1─n calendar_events
exchange_rates                   (globales: user_id nulo · manuales: user_id)
audit_logs                       (triggers en cuentas, movimientos, programados, categorías)
```

Transferencia = una fila con `account_id` (sale) y `to_account_id` (entra). Pagar la tarjeta es una transferencia banco → tarjeta; así el gasto se cuenta una sola vez (cuando se compra).

## Reglas del flujo de caja

- Saldo inicial: cuentas líquidas (ahorros, corriente, efectivo, billeteras).
- Gasto con tarjeta no mueve caja; su efecto llega con el pago de la tarjeta.
- Tarjeta con deuda y sin pago programado antes de su fecha límite → pago estimado por el total de la deuda.
- Transferencias entre cuentas líquidas no cambian el total; hacia inversión o tarjeta sí.
- Programados vencidos (últimos 15 días) sin registrar aparecen hoy como pendientes.

## Preparado para lo que viene

- Tablas por módulo con el mismo patrón `user_id` + RLS + auditoría.
- Familia: se agregará `family_id` y políticas por rol sobre las mismas tablas.
- Planes y pagos (Wompi): tablas `subscriptions`/`payments` y *feature flags* cuando el producto sea comercial.
