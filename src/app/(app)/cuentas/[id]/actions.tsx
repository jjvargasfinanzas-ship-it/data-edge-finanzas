"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { deleteAccount, setAccountArchived } from "@/app/actions/finance";
import { useAppData, type AccountOption } from "@/components/app/app-data";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function AccountActions({ account }: { account: AccountOption }) {
  const { openAccount } = useAppData();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" onClick={() => openAccount({ ...account })}>
        <Pencil className="size-4" /> Editar
      </Button>
      <Button
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await setAccountArchived(account.id, !account.is_archived);
            if (r.ok) toast.success(r.message);
            else toast.error(r.error);
          })
        }
      >
        {account.is_archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
        {account.is_archived ? "Restaurar" : "Archivar"}
      </Button>
      <ConfirmButton
        action={() => deleteAccount(account.id)}
        confirmLabel="¿Eliminar la cuenta?"
        onDone={() => router.push("/cuentas")}
        className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-negative hover:bg-negative-50"
      >
        <Trash2 className="size-4" /> Eliminar
      </ConfirmButton>
    </>
  );
}
