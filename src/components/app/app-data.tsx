"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import type { Currency } from "@/lib/money";
import { Modal } from "@/components/ui/modal";
import { TransactionForm, type TxInitial } from "./forms/transaction-form";
import { PlannedForm, type PlannedInitial } from "./forms/planned-form";
import { EventForm, type EventInitial } from "./forms/event-form";
import { AccountForm, type AccountInitial } from "./forms/account-form";
import { LoanForm, type LoanInitial } from "./forms/loan-form";
import { ObligationForm, type ObligationInitial } from "./forms/obligation-form";
import { PaymentForm, type PaymentInitial } from "./forms/payment-form";

export type AccountOption = Pick<
  Tables<"accounts">,
  "id" | "name" | "type" | "currency" | "is_archived" | "credit_limit" | "statement_day" | "due_day" | "institution" | "opening_balance" | "opening_date" | "include_in_net_worth"
> & { balance: number };
export type ObligationClassOption = { id: string; name: string; is_archived: boolean };
export type CategoryOption = Pick<Tables<"categories">, "id" | "name" | "kind" | "parent_id" | "icon" | "color" | "is_archived">;
export type PlannedOption = Pick<
  Tables<"planned_items">,
  "id" | "kind" | "name" | "amount" | "account_id" | "to_account_id" | "category_id" | "frequency" | "start_date" | "end_date" | "notes" | "is_active"
>;

type Sheet =
  | { type: "tx"; initial: TxInitial }
  | { type: "planned"; initial: PlannedInitial }
  | { type: "event"; initial: EventInitial }
  | { type: "account"; initial: AccountInitial }
  | { type: "loan"; initial: LoanInitial }
  | { type: "obligation"; initial: ObligationInitial }
  | { type: "payment"; initial: PaymentInitial }
  | null;

interface Ctx {
  accounts: AccountOption[];
  planned: PlannedOption[];
  categories: CategoryOption[];
  obligationClasses: ObligationClassOption[];
  today: string;
  currency: Currency;
  openTransaction: (initial?: TxInitial) => void;
  openPlanned: (initial?: PlannedInitial) => void;
  openEvent: (initial?: EventInitial) => void;
  openAccount: (initial?: AccountInitial) => void;
  openLoan: (initial?: LoanInitial) => void;
  openObligation: (initial?: ObligationInitial) => void;
  openPayment: (initial: PaymentInitial) => void;
}

const AppDataContext = createContext<Ctx | null>(null);

export function useAppData() {
  const c = useContext(AppDataContext);
  if (!c) throw new Error("useAppData fuera de AppDataProvider");
  return c;
}

const TITLES = {
  tx: { income: "Nuevo ingreso", expense: "Nuevo gasto", transfer: "Transferencia" },
};

export function AppDataProvider({
  accounts,
  planned,
  categories,
  obligationClasses,
  today,
  currency,
  children,
}: {
  accounts: AccountOption[];
  planned: PlannedOption[];
  categories: CategoryOption[];
  obligationClasses: ObligationClassOption[];
  today: string;
  currency: Currency;
  children: React.ReactNode;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = useCallback(() => setSheet(null), []);

  const value = useMemo<Ctx>(
    () => ({
      accounts,
      planned,
      categories,
      obligationClasses,
      today,
      currency,
      openTransaction: (initial = {}) => setSheet({ type: "tx", initial }),
      openPlanned: (initial = {}) => setSheet({ type: "planned", initial }),
      openEvent: (initial = {}) => setSheet({ type: "event", initial }),
      openAccount: (initial = {}) => setSheet({ type: "account", initial }),
      openLoan: (initial = {}) => setSheet({ type: "loan", initial }),
      openObligation: (initial = {}) => setSheet({ type: "obligation", initial }),
      openPayment: (initial) => setSheet({ type: "payment", initial }),
    }),
    [accounts, planned, categories, obligationClasses, today, currency],
  );

  let title = "";
  if (sheet?.type === "tx") title = sheet.initial.id ? "Editar movimiento" : TITLES.tx[sheet.initial.kind ?? "expense"];
  if (sheet?.type === "planned")
    title = sheet.initial.id
      ? "Editar programación"
      : sheet.initial.kind === "income"
        ? "Programar ingreso"
        : sheet.initial.kind === "transfer"
          ? "Programar transferencia"
          : "Programar gasto o pago";
  if (sheet?.type === "tx" && sheet.initial.planned_item_id && !sheet.initial.id)
    title = sheet.initial.kind === "income" ? "Registrar ingreso recibido" : sheet.initial.kind === "expense" ? "Registrar pago" : "Registrar transferencia";
  if (sheet?.type === "event") title = sheet.initial.id ? "Editar evento" : "Nuevo evento";
  if (sheet?.type === "account")
    title = sheet.initial.id
      ? sheet.initial.type === "loan_receivable" || sheet.initial.type === "loan_payable"
        ? "Editar préstamo"
        : "Editar cuenta"
      : sheet.initial.type === "credit_card"
        ? "Nueva tarjeta"
        : "Nueva cuenta";
  if (sheet?.type === "loan") title = "Registrar préstamo";
  if (sheet?.type === "obligation") title = sheet.initial.id ? "Editar obligación" : "Nueva obligación";
  if (sheet?.type === "payment") title = `Pago · ${sheet.initial.label}`;

  return (
    <AppDataContext.Provider value={value}>
      {children}
      <Modal
        open={!!sheet}
        onClose={close}
        title={title}
        description={
          sheet?.type === "planned"
            ? "Se repite automáticamente según la frecuencia. No cambia tu saldo hasta que lo marques como recibido o pagado."
            : undefined
        }
      >
        {sheet?.type === "tx" && <TransactionForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "planned" && <PlannedForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "event" && <EventForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "account" && <AccountForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "loan" && <LoanForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "obligation" && <ObligationForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "payment" && <PaymentForm initial={sheet.initial} onDone={close} />}
      </Modal>
    </AppDataContext.Provider>
  );
}
