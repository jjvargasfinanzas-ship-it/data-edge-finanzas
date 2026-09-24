"use client";

import { Select } from "@/components/ui/field";
import { ACCOUNT_GROUPS } from "@/lib/constants";
import type { AccountOption } from "../app-data";

export function AccountSelect({
  accounts,
  name,
  id,
  value,
  onChange,
  exclude,
  placeholder = "Selecciona una cuenta",
}: {
  accounts: AccountOption[];
  name: string;
  id?: string;
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
  placeholder?: string;
}) {
  const list = accounts.filter((a) => (!a.is_archived || a.id === value) && a.id !== exclude);
  return (
    <Select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">{placeholder}</option>
      {ACCOUNT_GROUPS.map((g) => {
        const items = list.filter((a) => g.types.includes(a.type));
        if (!items.length) return null;
        return (
          <optgroup key={g.label} label={g.label}>
            {items.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.currency !== "COP" ? ` · ${a.currency}` : ""}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}
