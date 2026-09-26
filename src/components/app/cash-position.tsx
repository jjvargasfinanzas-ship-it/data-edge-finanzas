import { ChevronDown, Equal, Minus, Plus } from "lucide-react";
import { AccountIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { formatMoney, type Currency } from "@/lib/money";
import type { AccountType } from "@/lib/constants";

export interface CashAccount {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  baseBalance: number;
}

/**
 * Posición de caja: Disponible hoy + Por recibir − Por pagar = Saldo proyectado.
 * Todo en moneda base. "Disponible" solo incluye movimientos registrados.
 */
export function CashPosition({
  currency,
  available,
  toReceive,
  toPay,
  projected,
  projectedLabel,
  receiveCount,
  payCount,
  overdueCount,
  includesCards = false,
  accounts,
  lowPoint,
}: {
  currency: Currency;
  available: number;
  toReceive: number;
  toPay: number;
  projected: number;
  projectedLabel: string;
  receiveCount: number;
  payCount: number;
  overdueCount: number;
  includesCards?: boolean;
  accounts: CashAccount[];
  lowPoint?: { value: number; label: string } | null;
}) {
  const Op = ({ icon: I }: { icon: typeof Plus }) => (
    <div className="flex items-center justify-center py-1 lg:py-0" aria-hidden>
      <span className="grid size-8 place-items-center rounded-full bg-surface text-muted ring-1 ring-line">
        <I className="size-4" strokeWidth={2.5} />
      </span>
    </div>
  );

  return (
    <section aria-label="Posición de caja" className="card overflow-hidden">
      <div className="grid items-stretch gap-0 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.1fr]">
        {/* Disponible */}
        <div className="p-5">
          <p className="text-[13px] font-semibold text-muted">Disponible hoy</p>
          <p className={cn("num mt-1 text-[22px] leading-tight font-semibold", available < 0 ? "text-negative" : "text-ink")}>
            {formatMoney(available, currency)}
          </p>
          <details className="group mt-2">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
              ¿De dónde sale? <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 rounded-xl bg-canvas p-3 text-xs">
              <p className="mb-2 text-muted">
                Suma de tus cuentas de banco, efectivo y billeteras con los movimientos que ya registraste. Lo programado no suma hasta que lo marques como recibido.
              </p>
              <ul className="space-y-1.5">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <AccountIcon type={a.type} className="size-6 rounded-md [&_svg]:size-3.5" />
                    <span className="flex-1 truncate font-semibold text-ink-2">{a.name}</span>
                    <span className={cn("num font-semibold", a.baseBalance < 0 ? "text-negative" : "text-ink")}>
                      {formatMoney(a.balance, a.currency)}
                    </span>
                  </li>
                ))}
                {!accounts.length && <li className="text-muted">No tienes cuentas de banco, efectivo o billetera.</li>}
              </ul>
            </div>
          </details>
        </div>
        <Op icon={Plus} />
        {/* Por recibir */}
        <div className="border-line p-5 max-lg:border-t lg:border-l-0">
          <p className="text-[13px] font-semibold text-muted">Por recibir</p>
          <p className="num mt-1 text-[22px] leading-tight font-semibold text-positive">{formatMoney(toReceive, currency)}</p>
          <p className="mt-2 text-xs text-muted">
            {receiveCount ? `${receiveCount} ingreso${receiveCount > 1 ? "s" : ""} programado${receiveCount > 1 ? "s" : ""} pendiente${receiveCount > 1 ? "s" : ""}` : "Nada pendiente por recibir"}
          </p>
        </div>
        <Op icon={Minus} />
        {/* Por pagar */}
        <div className="border-line p-5 max-lg:border-t">
          <p className="text-[13px] font-semibold text-muted">Por pagar</p>
          <p className="num mt-1 text-[22px] leading-tight font-semibold text-ink">{formatMoney(toPay, currency)}</p>
          <p className="mt-2 text-xs text-muted">
            {payCount ? `${payCount} pago${payCount > 1 ? "s" : ""} pendiente${payCount > 1 ? "s" : ""}${includesCards ? ", incluye tarjetas" : ""}` : "Nada pendiente por pagar"}
            {overdueCount > 0 && <span className="ml-1 font-semibold text-warning">· {overdueCount} vencido{overdueCount > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Op icon={Equal} />
        {/* Proyectado */}
        <div className="bg-tint p-5">
          <p className="text-[13px] font-semibold text-muted">Saldo proyectado</p>
          <p className={cn("num mt-1 text-[22px] leading-tight font-semibold", projected < 0 ? "text-negative" : "text-teal-700")}>
            {formatMoney(projected, currency)}
          </p>
          <p className="mt-2 text-xs text-muted">{projectedLabel}</p>
          {lowPoint && lowPoint.value < projected && (
            <p className={cn("mt-1 text-xs", lowPoint.value < 0 ? "font-semibold text-negative" : "text-muted")}>
              Punto más bajo: <span className="num">{formatMoney(lowPoint.value, currency)}</span> el {lowPoint.label}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
