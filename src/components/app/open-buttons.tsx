"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "./app-data";
import type { TxInitial } from "./forms/transaction-form";
import type { PlannedInitial } from "./forms/planned-form";
import type { EventInitial } from "./forms/event-form";
import type { AccountInitial } from "./forms/account-form";
import type { LoanInitial } from "./forms/loan-form";
import type { ObligationInitial } from "./forms/obligation-form";
import type { PaymentInitial } from "./forms/payment-form";

type Props = { children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "dark"; size?: "sm" | "md" | "lg"; className?: string; icon?: boolean };

export function NewTransactionButton({ initial, ...p }: Props & { initial?: TxInitial }) {
  const { openTransaction } = useAppData();
  return (
    <Button variant={p.variant} size={p.size} className={p.className} onClick={() => openTransaction(initial)}>
      {p.icon !== false && <Plus className="size-4" />}
      {p.children}
    </Button>
  );
}

export function NewPlannedButton({ initial, ...p }: Props & { initial?: PlannedInitial }) {
  const { openPlanned } = useAppData();
  return (
    <Button variant={p.variant} size={p.size} className={p.className} onClick={() => openPlanned(initial)}>
      {p.icon !== false && <Plus className="size-4" />}
      {p.children}
    </Button>
  );
}

export function NewEventButton({ initial, ...p }: Props & { initial?: EventInitial }) {
  const { openEvent } = useAppData();
  return (
    <Button variant={p.variant} size={p.size} className={p.className} onClick={() => openEvent(initial)}>
      {p.icon !== false && <Plus className="size-4" />}
      {p.children}
    </Button>
  );
}

export function NewAccountButton({ initial, ...p }: Props & { initial?: AccountInitial }) {
  const { openAccount } = useAppData();
  return (
    <Button variant={p.variant} size={p.size} className={p.className} onClick={() => openAccount(initial)}>
      {p.icon !== false && <Plus className="size-4" />}
      {p.children}
    </Button>
  );
}

export function NewLoanButton({ initial, ...p }: Props & { initial?: LoanInitial }) {
  const { openLoan } = useAppData();
  return (
    <Button variant={p.variant} size={p.size} className={p.className} onClick={() => openLoan(initial)}>
      {p.icon !== false && <Plus className="size-4" />}
      {p.children}
    </Button>
  );
}

/** Abono a un préstamo: transferencia entre el préstamo y una cuenta propia (no es ingreso ni gasto). */
export function LoanPaymentButton({
  loan,
  ...p
}: Props & { loan: { id: string; name: string; type: string; institution: string | null } }) {
  const { openTransaction, accounts } = useAppData();
  const open = accounts.filter((a) => !a.is_archived);
  const own =
    open.find((a) => a.type === "bank_savings" || a.type === "bank_checking") ??
    open.find((a) => a.type === "digital_wallet" || a.type === "cash");
  const receivable = loan.type === "loan_receivable";
  const who = loan.institution || loan.name;
  return (
    <Button
      variant={p.variant ?? "secondary"}
      size={p.size}
      className={p.className}
      onClick={() =>
        openTransaction({
          kind: "transfer",
          account_id: receivable ? loan.id : own?.id,
          to_account_id: receivable ? (own?.id ?? null) : loan.id,
          description: receivable ? `Abono de ${who}` : `Abono a ${who}`,
        })
      }
    >
      {p.children}
    </Button>
  );
}

export function NewObligationButton({ initial, ...p }: Props & { initial?: ObligationInitial }) {
  const { openObligation } = useAppData();
  return (
    <Button variant={p.variant} size={p.size} className={p.className} onClick={() => openObligation(initial)}>
      {p.icon !== false && <Plus className="size-4" />}
      {p.children}
    </Button>
  );
}

export function PayObligationButton({ initial, ...p }: Props & { initial: PaymentInitial }) {
  const { openPayment } = useAppData();
  return (
    <Button variant={p.variant} size={p.size} className={p.className} onClick={() => openPayment(initial)}>
      {p.children}
    </Button>
  );
}
