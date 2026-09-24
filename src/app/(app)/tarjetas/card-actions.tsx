"use client";

import Link from "next/link";
import { useAppData, type AccountOption } from "@/components/app/app-data";
import { Button } from "@/components/ui/button";

export function CardActions({ card, debt }: { card: AccountOption; debt: number }) {
  const { accounts, openTransaction, openAccount } = useAppData();
  const bank = accounts.find((a) => !a.is_archived && ["bank_savings", "bank_checking", "digital_wallet"].includes(a.type));
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" onClick={() => openAccount({ ...card })}>
        Editar
      </Button>
      <Link href={`/cuentas/${card.id}`} className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-navy-900/5">
        Movimientos
      </Link>
      <Button variant="secondary" size="sm" onClick={() => openTransaction({ kind: "expense", account_id: card.id })}>
        Compra
      </Button>
      <Button
        size="sm"
        disabled={debt <= 0}
        onClick={() =>
          openTransaction({ kind: "transfer", account_id: bank?.id, to_account_id: card.id, amount: debt, description: `Pago ${card.name}` })
        }
      >
        Pagar
      </Button>
    </div>
  );
}
