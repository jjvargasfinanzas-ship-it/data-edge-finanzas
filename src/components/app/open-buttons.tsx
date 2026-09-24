"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "./app-data";
import type { TxInitial } from "./forms/transaction-form";
import type { PlannedInitial } from "./forms/planned-form";
import type { EventInitial } from "./forms/event-form";
import type { AccountInitial } from "./forms/account-form";

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
