"use client";

import { useActionState, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, ReceiptText } from "lucide-react";
import { saveObligationClass, setObligationClassArchived } from "@/app/actions/obligations";
import { initialState } from "@/app/actions/types";
import { useFormResult } from "@/components/app/forms/use-form-result";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";

type Item = { id: string; name: string; is_archived: boolean; count: number };

function NameForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveObligationClass, initialState);
  useFormResult(state, onDone);
  return (
    <form action={action} className="flex items-center gap-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      <Input name="name" defaultValue={item?.name} required maxLength={60} autoFocus placeholder="Ej. Cooperativas" className="h-9 text-sm" aria-label="Nombre" />
      <Button type="submit" size="sm" loading={pending}>
        Guardar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancelar
      </Button>
    </form>
  );
}

/**
 * Clasificación de obligaciones: categoría principal "Obligaciones financieras"
 * con subcategorías por tipo de acreedor. Es independiente de ingresos y gastos.
 */
export function ObligationClassesManager({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const list = items.filter((i) => showArchived || !i.is_archived);
  const archived = items.filter((i) => i.is_archived).length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-pastel-navy px-3.5 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/70 text-navy-700">
          <ReceiptText className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Obligaciones financieras</p>
          <p className="text-xs text-ink-2/80">Categoría propia: los préstamos y obligaciones no son ingresos ni gastos.</p>
        </div>
      </div>

      <ul className="divide-y divide-line rounded-xl border border-card-border">
        {list.map((i) => (
          <li key={i.id} className={cn("flex items-center gap-2 px-3.5 py-2.5", i.is_archived && "opacity-60")}>
            {editing === i.id ? (
              <div className="flex-1">
                <NameForm item={i} onDone={() => setEditing(null)} />
              </div>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{i.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {i.count} obligaci{i.count === 1 ? "ón" : "ones"}
                </span>
                <button type="button" onClick={() => setEditing(i.id)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-tint-2 hover:text-ink" aria-label={`Renombrar ${i.name}`}>
                  <Pencil className="size-3.5" />
                </button>
                <ConfirmButton
                  action={() => setObligationClassArchived(i.id, !i.is_archived)}
                  confirmLabel={i.is_archived ? "¿Restaurar?" : "¿Archivar?"}
                  className="grid size-8 place-items-center rounded-lg text-muted hover:bg-tint-2 hover:text-ink"
                >
                  {i.is_archived ? <ArchiveRestore className="size-3.5" aria-label="Restaurar" /> : <Archive className="size-3.5" aria-label="Archivar" />}
                </ConfirmButton>
              </>
            )}
          </li>
        ))}
        {!list.length && <li className="px-3.5 py-4 text-sm text-muted">Aún no hay subcategorías. Ejecuta la actualización de la base de datos.</li>}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {editing === "new" ? (
          <div className="w-full">
            <NameForm onDone={() => setEditing(null)} />
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Nueva subcategoría
          </Button>
        )}
        {archived > 0 && editing !== "new" && (
          <button type="button" onClick={() => setShowArchived((v) => !v)} className="text-xs font-semibold text-teal-700 hover:underline">
            {showArchived ? "Ocultar archivadas" : `Ver ${archived} archivada${archived > 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}
