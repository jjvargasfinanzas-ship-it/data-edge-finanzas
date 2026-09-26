"use client";

import { useActionState, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveCategory, setCategoryArchived } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { useFormResult } from "@/components/app/forms/use-form-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input, Segmented } from "@/components/ui/field";
import { CategoryIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import type { Tables } from "@/lib/supabase/database.types";

type Category = Tables<"categories">;

function CategoryForm({ initial, onDone }: { initial: { id?: string; name?: string; kind: "income" | "expense"; parent_id?: string | null }; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCategory, initialState);
  useFormResult(state, onDone);
  return (
    <form action={action} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kind" value={initial.kind} />
      {initial.parent_id && <input type="hidden" name="parent_id" value={initial.parent_id} />}
      <Input name="name" defaultValue={initial.name ?? ""} required maxLength={60} data-autofocus="" placeholder="Nombre" aria-label="Nombre" />
      {state.fieldErrors?.name && <p className="text-xs text-negative">{state.fieldErrors.name}</p>}
      <Button type="submit" className="w-full" loading={pending}>
        Guardar
      </Button>
    </form>
  );
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [editing, setEditing] = useState<{ id?: string; name?: string; kind: "income" | "expense"; parent_id?: string | null; title: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const parents = categories.filter((c) => c.kind === kind && !c.parent_id && (showArchived || !c.is_archived));

  const toggle = async (c: Category) => {
    const r = await setCategoryArchived(c.id, !c.is_archived);
    if (r.ok) toast.success(r.message);
    else toast.error(r.error);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          className="w-64"
          options={[
            { value: "expense", label: "Gastos" },
            { value: "income", label: "Ingresos" },
          ]}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-teal-600" /> Ver archivadas
          </label>
          <Button size="sm" onClick={() => setEditing({ kind, title: "Nueva categoría" })}>
            <Plus className="size-4" /> Categoría
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {parents.map((p) => {
          const subs = categories.filter((c) => c.parent_id === p.id && (showArchived || !c.is_archived));
          return (
            <div key={p.id} className={cn("rounded-2xl border border-line p-3", p.is_archived && "opacity-55")}>
              <div className="flex items-center gap-2.5">
                <CategoryIcon icon={p.icon} color={p.color} size="sm" />
                <span className="flex-1 truncate text-sm font-semibold text-ink">{p.name}</span>
                <button type="button" onClick={() => setEditing({ id: p.id, name: p.name, kind, title: "Editar categoría" })} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink" aria-label={`Editar ${p.name}`}>
                  <Pencil className="size-3.5" />
                </button>
                <button type="button" onClick={() => toggle(p)} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink" aria-label={p.is_archived ? `Restaurar ${p.name}` : `Archivar ${p.name}`}>
                  {p.is_archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <span key={s.id} className={cn("group inline-flex items-center gap-1 rounded-full bg-canvas py-0.5 pr-1 pl-2.5 text-xs font-semibold text-ink-2", s.is_archived && "line-through opacity-60")}>
                    <button type="button" onClick={() => setEditing({ id: s.id, name: s.name, kind, title: "Editar subcategoría" })} className="hover:text-ink">
                      {s.name}
                    </button>
                    <button type="button" onClick={() => toggle(s)} className="grid size-5 place-items-center rounded-full text-muted hover:bg-line hover:text-ink" aria-label={s.is_archived ? `Restaurar ${s.name}` : `Archivar ${s.name}`}>
                      {s.is_archived ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setEditing({ kind, parent_id: p.id, title: `Nueva subcategoría de ${p.name}` })}
                  className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs font-semibold text-muted hover:border-teal-500 hover:text-teal-700"
                >
                  <Plus className="size-3" /> Sub
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.title ?? ""} size="sm">
        {editing && <CategoryForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
