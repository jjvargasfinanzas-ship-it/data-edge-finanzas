"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";

function formatTyping(raw: string, decimals: boolean): string {
  let s = raw.replace(/[^\d,]/g, "");
  const firstComma = s.indexOf(",");
  let dec = "";
  if (firstComma >= 0) {
    dec = decimals ? s.slice(firstComma + 1).replace(/,/g, "").slice(0, 2) : "";
    s = s.slice(0, firstComma);
  }
  s = s.replace(/^0+(?=\d)/, "");
  const int = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return firstComma >= 0 && decimals ? `${int},${dec}` : int;
}

export function toInputValue(n: number | null | undefined, decimals = false): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  const [i, d] = Math.abs(n).toFixed(decimals ? 2 : 0).split(".");
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimals && d && d !== "00" ? `${int},${d}` : int;
}

export function AmountInput({
  name,
  defaultValue,
  decimals = false,
  large,
  id,
  autoFocus,
  prefix = "$",
  placeholder = "0",
  invalid,
  onValueChange,
}: {
  name: string;
  defaultValue?: number | null;
  decimals?: boolean;
  large?: boolean;
  id?: string;
  autoFocus?: boolean;
  prefix?: string;
  placeholder?: string;
  invalid?: boolean;
  onValueChange?: (raw: string) => void;
}) {
  const [value, setValue] = useState(() => toInputValue(defaultValue, decimals));
  return (
    <div
      className={cn(
        "flex items-center rounded-xl border bg-surface transition-colors focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/15",
        invalid ? "border-negative" : "border-line-strong",
        large ? "h-16 px-4" : "h-11 px-3.5",
      )}
    >
      <span className={cn("mr-2 font-semibold text-muted", large ? "text-2xl" : "text-[15px]")}>{prefix}</span>
      <input
        id={id}
        name={name}
        inputMode={decimals ? "decimal" : "numeric"}
        autoComplete="off"
        autoFocus={autoFocus}
        data-autofocus={autoFocus ? "" : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const v = formatTyping(e.target.value, decimals);
          setValue(v);
          onValueChange?.(v);
        }}
        className={cn(
          "num w-full min-w-0 bg-transparent font-bold text-ink outline-none placeholder:text-muted/40",
          large ? "text-3xl" : "text-[15px]",
        )}
      />
    </div>
  );
}
