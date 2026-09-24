import { cn } from "@/components/ui/cn";

/** Marca Data Edge: un borde ascendente (edge) sobre una base estable. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0A1F3C" />
      <path d="M8 22.5h16" stroke="#3A6299" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 18l5.5-5 4 3.5L24 9.5" fill="none" stroke="#3DD6C2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="9.5" r="2.2" fill="#3DD6C2" />
    </svg>
  );
}

export function Logo({ className, tone = "dark", product = "Finanzas" }: { className?: string; tone?: "dark" | "light"; product?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className={cn("block text-[15px] font-extrabold tracking-tight", tone === "light" ? "text-white" : "text-navy-900")}>
          Data Edge
        </span>
        <span className={cn("block text-[11px] font-semibold tracking-[0.18em] uppercase", tone === "light" ? "text-teal-300" : "text-teal-600")}>
          {product}
        </span>
      </span>
    </span>
  );
}
