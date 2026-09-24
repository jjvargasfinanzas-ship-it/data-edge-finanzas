"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { useFormResult } from "@/components/app/forms/use-form-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/money";
import type { Tables } from "@/lib/supabase/database.types";

const COUNTRIES = [
  ["CO", "Colombia"], ["MX", "México"], ["US", "Estados Unidos"], ["ES", "España"], ["PE", "Perú"], ["CL", "Chile"],
  ["EC", "Ecuador"], ["PA", "Panamá"], ["AR", "Argentina"], ["GB", "Reino Unido"],
];
const ZONES = ["America/Bogota", "America/Mexico_City", "America/Lima", "America/Santiago", "America/New_York", "America/Panama", "Europe/Madrid", "Europe/London"];

export function ProfileForm({ profile }: { profile: Tables<"profiles"> }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  useFormResult(state);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre" htmlFor="first_name" error={fe.first_name}>
        <Input id="first_name" name="first_name" defaultValue={profile.first_name ?? ""} required />
      </Field>
      <Field label="Apellido" htmlFor="last_name">
        <Input id="last_name" name="last_name" defaultValue={profile.last_name ?? ""} />
      </Field>
      <Field label="País" htmlFor="country">
        <Select id="country" name="country" defaultValue={profile.country}>
          {COUNTRIES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ciudad" htmlFor="city">
        <Input id="city" name="city" defaultValue={profile.city ?? ""} placeholder="Ej. Medellín" />
      </Field>
      <Field label="Moneda principal" htmlFor="base_currency">
        <Select id="base_currency" name="base_currency" defaultValue={profile.base_currency}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} · {CURRENCY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Zona horaria" htmlFor="timezone">
        <Select id="timezone" name="timezone" defaultValue={profile.timezone}>
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z.replace("_", " ")}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Guardar perfil
        </Button>
      </div>
    </form>
  );
}
