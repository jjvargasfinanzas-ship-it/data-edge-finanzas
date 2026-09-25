import type { Enums } from "./supabase/database.types";

export type AccountType = Enums<"account_type">;
export type EventType = Enums<"event_type">;
export type TxKind = Enums<"transaction_kind">;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank_savings: "Cuenta de ahorros",
  bank_checking: "Cuenta corriente",
  cash: "Efectivo",
  digital_wallet: "Billetera digital",
  investment: "Cuenta de inversión",
  credit_card: "Tarjeta de crédito",
  other: "Otra",
  loan_receivable: "Préstamo que hice",
  loan_payable: "Préstamo que recibí",
};

export const LOAN_TYPES: AccountType[] = ["loan_receivable", "loan_payable"];
export const isLoan = (t: AccountType) => LOAN_TYPES.includes(t);

export const ACCOUNT_GROUPS: { label: string; types: AccountType[] }[] = [
  { label: "Bancos", types: ["bank_savings", "bank_checking"] },
  { label: "Efectivo y billeteras", types: ["cash", "digital_wallet"] },
  { label: "Inversión", types: ["investment"] },
  { label: "Tarjetas de crédito", types: ["credit_card"] },
  { label: "Préstamos", types: ["loan_receivable", "loan_payable"] },
  { label: "Otras", types: ["other"] },
];

export const KIND_LABELS: Record<TxKind, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  birthday: "Cumpleaños",
  appointment: "Cita",
  activity: "Actividad",
  reminder: "Recordatorio",
  other: "Otro",
};

export const MAIN_GOALS = [
  { value: "organize_expenses", label: "Organizar mis gastos", hint: "Saber en qué se va mi dinero cada mes" },
  { value: "save_more", label: "Ahorrar más", hint: "Separar dinero con propósito" },
  { value: "get_out_of_debt", label: "Salir de deudas", hint: "Pagar y dejar de pagar intereses" },
  { value: "family_finances", label: "Controlar las finanzas familiares", hint: "Ordenar el dinero de la casa" },
  { value: "start_investing", label: "Comenzar a invertir", hint: "Poner mi dinero a trabajar" },
  { value: "build_wealth", label: "Construir patrimonio", hint: "Crecer mis activos en el tiempo" },
  { value: "plan_goal", label: "Planificar una meta", hint: "Viaje, casa, carro, estudio…" },
] as const;

/** Módulos de los siguientes bloques del roadmap. */
export const UPCOMING_MODULES: Record<string, { title: string; description: string; block: string }> = {
  conciliacion: {
    title: "Conciliación de extractos",
    description:
      "Sube al cierre de mes los extractos de tus bancos y tarjetas. La app leerá los movimientos, los cruzará con lo que registraste y te mostrará diferencias para confirmarlas con un clic.",
    block: "Bloque 2",
  },
  presupuesto: {
    title: "Presupuesto",
    description: "Presupuesto mensual y anual por categoría con ejecutado, disponible y alertas al 50%, 75%, 90% y 100%.",
    block: "Bloque 3",
  },
  deudas: {
    title: "Deudas",
    description: "Créditos con capital, tasa, cuotas y tabla de amortización: cuánto pagas de capital y cuánto de intereses.",
    block: "Bloque 3",
  },
  metas: {
    title: "Metas",
    description: "Fondo de emergencia, viajes, vivienda, educación. Te dice cuánto ahorrar al mes para llegar a tiempo.",
    block: "Bloque 3",
  },
  inversiones: {
    title: "Inversiones",
    description: "CDT, fondos, acciones, ETF, cripto e inmuebles: capital invertido, valor actual, rentabilidad y distribución.",
    block: "Bloque 3",
  },
  patrimonio: {
    title: "Mi patrimonio",
    description: "Activos menos pasivos con su evolución histórica mes a mes.",
    block: "Bloque 3",
  },
  analisis: {
    title: "Análisis",
    description: "Tasa de ahorro, endeudamiento, liquidez y comparativos mes contra mes y año contra año, con explicación sencilla.",
    block: "Bloque 4",
  },
  proyecciones: {
    title: "Mi futuro financiero",
    description: "Escenarios conservador, esperado y optimista para ingresos, gastos, ahorro y patrimonio.",
    block: "Bloque 4",
  },
  familia: {
    title: "Mi familia",
    description: "Grupo familiar con roles y permisos, y un tablero con las finanzas del hogar.",
    block: "Bloque 5",
  },
  intelligence: {
    title: "Data Edge Intelligence",
    description: "Análisis automático de tus datos que explica de dónde sale cada cifra. Es análisis, no asesoría financiera.",
    block: "Bloque 5",
  },
  reportes: {
    title: "Reportes",
    description: "Reportes de ingresos, gastos, flujo de caja y patrimonio exportables a PDF y Excel.",
    block: "Bloque 4",
  },
};
