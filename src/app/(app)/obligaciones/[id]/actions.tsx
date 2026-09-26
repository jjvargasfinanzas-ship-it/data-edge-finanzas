"use client";

import { useRouter } from "next/navigation";
import { Ban, Pencil, RotateCcw, Trash2, Wallet } from "lucide-react";
import { deleteObligation, setObligationStatus } from "@/app/actions/obligations";
import { deleteTransaction } from "@/app/actions/finance";
import { useAppData } from "@/components/app/app-data";
import type { ObligationInitial } from "@/components/app/forms/obligation-form";
import type { PaymentInitial } from "@/components/app/forms/payment-form";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function ObligationActions({
  edit,
  pay,
  status,
  canPay,
}: {
  edit: ObligationInitial & { id: string };
  pay: PaymentInitial;
  status: string;
  canPay: boolean;
}) {
  const { openObligation, openPayment } = useAppData();
  const router = useRouter();
  const cancelled = status === "cancelled";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canPay && (
        <Button size="sm" onClick={() => openPayment(pay)}>
          <Wallet className="size-4" /> Registrar pago
        </Button>
      )}
      <Button size="sm" variant="secondary" onClick={() => openObligation(edit)}>
        <Pencil className="size-3.5" /> Editar
      </Button>
      <ConfirmButton
        action={() => setObligationStatus(edit.id, cancelled ? "active" : "cancelled")}
        confirmLabel={cancelled ? "¿Reactivar?" : "¿Anular? Sale de tus totales"}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-ink-2 hover:bg-tint-2"
      >
        {cancelled ? <RotateCcw className="size-3.5" /> : <Ban className="size-3.5" />}
        {cancelled ? "Reactivar" : "Anular"}
      </ConfirmButton>
      <ConfirmButton
        action={() => deleteObligation(edit.id)}
        confirmLabel="¿Eliminar? Los pagos quedan en movimientos"
        onDone={() => router.push("/obligaciones")}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-negative hover:bg-negative-50"
      >
        <Trash2 className="size-3.5" /> Eliminar
      </ConfirmButton>
    </div>
  );
}

export function DeletePayment({ id }: { id: string }) {
  return (
    <ConfirmButton
      action={() => deleteTransaction(id)}
      confirmLabel="¿Eliminar pago?"
      className="grid size-7 place-items-center rounded-lg text-muted hover:bg-negative-50 hover:text-negative"
    >
      <Trash2 className="size-3.5" aria-label="Eliminar pago" />
    </ConfirmButton>
  );
}
