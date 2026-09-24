"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import type { Currency } from "@/lib/money";
import { Modal } from "@/components/ui/modal";
import { TransactionForm, type TxInitial } from "./forms/transaction-form";
import { PlannedForm, type PlannedInitial } from "./forms/planned-form";
import { EventForm, type EventInitial } from "./forms/event-form";
import { AccountForm, type AccountInitial } from "./forms/account-form";

export type AccountOption = Pick<
  Tables<"accounts">,
  "id" | "name" | "type" | "currency" | "is_archived" | "credit_limit" | "statement_day" | "due_day" | "institution" | "opening_balance" | "opening_date" | "include_in_net_worth"
> & { balance: number };
export type CategoryOption = Pick<Tables<"categories">, "id" | "name" | "kind" | "parent_id" | "icon" | "color" | "is_archived">;

type Sheet =
  | { type: "tx"; initial: TxInitial }
  | { type: "planned"; initial: PlannedInitial }
  | { type: "event"; initial: EventInitial }
  | { type: "account"; initial: AccountInitial }
  | null;

interface Ctx {
  accounts: AccountOption[];
  categories: CategoryOption[];
  today: string;
  currency: Currency;
  openTransaction: (initial?: TxInitial) => void;
  openPlanned: (initial?: PlannedInitial) => void;
  openEvent: (initial?: EventInitial) => void;
  openAccount: (initial?: AccountInitial) => void;
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
  categories,
  today,
  currency,
  children,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  today: string;
  currency: Currency;
  children: React.ReactNode;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = useCallback(() => setSheet(null), []);

  const value = useMemo<Ctx>(
    () => ({
      accounts,
      categories,
      today,
      currency,
      openTransaction: (initial = {}) => setSheet({ type: "tx", initial }),
      openPlanned: (initial = {}) => setSheet({ type: "planned", initial }),
      openEvent: (initial = {}) => setSheet({ type: "event", initial }),
      openAccount: (initial = {}) => setSheet({ type: "account", initial }),
    }),
    [accounts, categories, today, currency],
  );

  let title = "";
  if (sheet?.type === "tx") title = sheet.initial.id ? "Editar movimiento" : TITLES.tx[sheet.initial.kind ?? "expense"];
  if (sheet?.type === "planned") title = sheet.initial.id ? "Editar programado" : "Nuevo programado";
  if (sheet?.type === "event") title = sheet.initial.id ? "Editar evento" : "Nuevo evento";
  if (sheet?.type === "account")
    title = sheet.initial.id ? "Editar cuenta" : sheet.initial.type === "credit_card" ? "Nueva tarjeta" : "Nueva cuenta";

  return (
    <AppDataContext.Provider value={value}>
      {children}
      <Modal
        open={!!sheet}
        onClose={close}
        title={title}
        description={
          sheet?.type === "planned"
            ? "Ingresos, pagos y gastos que esperas. Alimentan tu flujo de caja y tu calendario."
            : undefined
        }
      >
        {sheet?.type === "tx" && <TransactionForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "planned" && <PlannedForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "event" && <EventForm initial={sheet.initial} onDone={close} />}
        {sheet?.type === "account" && <AccountForm initial={sheet.initial} onDone={close} />}
      </Modal>
    </AppDataContext.Provider>
  );
}
