# Data Edge Finanzas

**Tu dinero. Bajo control.** Finanzas personales y familiares del ecosistema Data Edge.

Versión actual: **Bloque 1 — Base, movimientos y flujo de caja futuro** (uso personal / validación).

| Módulo | Estado |
|---|---|
| Registro, login, recuperación de contraseña, verificación de correo, rutas protegidas | ✅ |
| Onboarding (objetivo, cuentas, ingreso principal, gastos fijos) | ✅ |
| Dashboard (saludo, frase del día, ingresos/gastos/ahorro vs. mes anterior, patrimonio en cuentas) | ✅ |
| Movimientos (ingresos, gastos, transferencias, filtros, búsqueda, paginación, CSV) | ✅ |
| Cuentas (bancos, efectivo, billeteras, inversión) con saldo automático y saldo corrido | ✅ |
| Tarjetas (cupo, utilizado, disponible, corte, pago, alertas, pago en un clic) | ✅ |
| Programados (ingresos/gastos/pagos recurrentes: semanal, quincenal, mensual… anual) | ✅ |
| **Flujo de caja futuro** (diario/semanal/mensual, 30–180 días, alerta de saldo negativo) | ✅ |
| **Calendario financiero** (mes/semana/agenda/día, saldo estimado por día, eventos, cortes y pagos) | ✅ |
| Multimoneda (COP, USD, EUR, MXN, GBP) con TRM automática y tasa manual | ✅ |
| Categorías y subcategorías personalizables | ✅ |
| PWA instalable | ✅ |
| Conciliación de extractos · Presupuesto · Deudas · Metas · Inversiones · Patrimonio · Análisis · Proyecciones · Familia · Intelligence · Reportes | Próximos bloques (ver `docs/ROADMAP.md`) |

## Stack

Next.js 16 (App Router, Server Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · Recharts · Vercel.

## Puesta en marcha local

```bash
npm install
cp .env.example .env.local   # completa las variables
npm run dev                  # http://localhost:3000
npm test                     # pruebas unitarias (motor de flujo de caja, recurrencias, dinero)
```

## Supabase

Proyecto: `data-edge-finanzas` (ref `zkuasrpghsecxedszwxh`). Las migraciones de `supabase/migrations` **ya están aplicadas**.

Configuración pendiente en el panel de Supabase (**Authentication**):

1. **URL Configuration**
   - *Site URL*: la URL de producción en Vercel (p. ej. `https://finanzas.dataedgeconsulting.com`).
   - *Redirect URLs*: `http://localhost:3000/**` y `https://*-tu-equipo.vercel.app/**` (previews).
2. **Email Templates** (recomendado, funciona desde cualquier navegador):
   - *Confirm signup*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/bienvenida`
   - *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
3. **SMTP**: el correo por defecto de Supabase tiene un límite muy bajo y solo sirve para pruebas. Antes de invitar a otras personas configura un SMTP propio (Resend, Brevo, etc.) en *Project Settings → Authentication → SMTP*.
4. **Google OAuth** (opcional): habilita el proveedor en *Sign In / Providers* y pon `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

Regenerar tipos: `npx supabase gen types typescript --project-id zkuasrpghsecxedszwxh > src/lib/supabase/database.types.ts`.

## Despliegue en Vercel

1. Sube el repositorio a GitHub e impórtalo en Vercel.
2. Variables de entorno (Production y Preview): todas las de `.env.example`.
   - `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` solo en el servidor; nunca con prefijo `NEXT_PUBLIC_`.
3. `vercel.json` programa la actualización de tasas (TRM) de lunes a viernes a las 8:00 a. m. (hora de Colombia).

## Arquitectura

Ver `docs/ARQUITECTURA.md`.

## Pruebas del backend simulado

`DE_FAKE_BACKEND=1 npm run build && DE_FAKE_BACKEND=1 npm start` levanta la app con datos de ejemplo en memoria (sin Supabase), útil para revisar pantallas. No afecta el build normal.

---
Data Edge Finanzas ofrece organización y análisis de la información del propio usuario. No es asesoría financiera, tributaria ni de inversión.
