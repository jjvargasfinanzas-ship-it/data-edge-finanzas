"use client";

import { useActionState, useState } from "react";
import { saveEvent } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/constants";
import { FREQUENCY_LABELS, type Frequency } from "@/lib/recurrence";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type EventInitial = Partial<{
  id: string;
  title: string;
  event_type: EventType;
  event_date: string;
  event_time: string | null;
  frequency: Frequency;
  end_date: string | null;
  remind_days_before: number;
  notes: string | null;
}>;

export function EventForm({ initial, onDone }: { initial: EventInitial; onDone: () => void }) {
  const { today } = useAppData();
  const [state, action, pending] = useActionState(saveEvent, initialState);
  useFormResult(state, onDone);
  const [type, setType] = useState<EventType>(initial.event_type ?? "reminder");
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Título" htmlFor="title" error={fe.title}>
        <Input id="title" name="title" required maxLength={100} defaultValue={initial.title ?? ""} data-autofocus="" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tipo" htmlFor="event_type">
          <Select id="event_type" name="event_type" value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha" htmlFor="event_date" error={fe.event_date}>
          <Input id="event_date" name="event_date" type="date" required defaultValue={initial.event_date ?? today} />
        </Field>
        <Field label="Hora (opcional)" htmlFor="event_time">
          <Input id="event_time" name="event_time" type="time" defaultValue={initial.event_time?.slice(0, 5) ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {type === "birthday" ? (
          <Field label="Repetición">
            <p className="flex h-11 items-center rounded-xl bg-canvas px-3.5 text-sm text-ink-2">Cada año</p>
          </Field>
        ) : (
          <Field label="Repetición" htmlFor="frequency">
            <Select id="frequency" name="frequency" defaultValue={initial.frequency ?? "once"}>
              {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l === "Único" ? "No se repite" : l}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Recordarme" htmlFor="remind_days_before">
          <Select id="remind_days_before" name="remind_days_before" defaultValue={String(initial.remind_days_before ?? 0)}>
            <option value="0">El mismo día</option>
            <option value="1">1 día antes</option>
            <option value="3">3 días antes</option>
            <option value="7">1 semana antes</option>
            <option value="15">15 días antes</option>
          </Select>
        </Field>
      </div>
      <Field label="Notas" htmlFor="notes">
        <Textarea id="notes" name="notes" maxLength={500} defaultValue={initial.notes ?? ""} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {initial.id ? "Guardar cambios" : "Crear evento"}
      </Button>
    </form>
  );
}
