"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft, ArrowLeftRight, HandCoins, ArrowUpRight, CalendarClock, CalendarPlus, ExternalLink, LayoutDashboard, Lock,
  LogOut, Menu, Plus, ReceiptText, Settings, Waves, CalendarDays, X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/components/ui/cn";
import { useAppData } from "./app-data";
import { MAIN_NAV, UPCOMING_NAV, type NavItem } from "./nav";

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function NavLink({ item, path, locked, onNavigate }: { item: NavItem; path: string; locked?: boolean; onNavigate?: () => void }) {
  const active = isActive(path, item.href);
  const I = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
        active ? "bg-pastel-teal font-semibold text-teal-700" : locked ? "text-muted/70 hover:text-ink-2" : "text-ink-2 hover:bg-tint-2 hover:text-ink",
      )}
    >
      <I className={cn("size-4 shrink-0", active ? "text-teal-600" : "text-muted")} strokeWidth={2.1} />
      <span className="flex-1 truncate">{item.label}</span>
      {locked && <Lock className="size-3.5 opacity-60" aria-label="Próximamente" />}
    </Link>
  );
}

function SidebarContent({ path, name, onNavigate }: { path: string; name: string; onNavigate?: () => void }) {
  const dataEdgeUrl = process.env.NEXT_PUBLIC_DATA_EDGE_URL ?? "https://dataedgeconsulting.com";
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <Link href="/inicio" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Principal">
        <div className="space-y-0.5">
          {MAIN_NAV.map((i) => (
            <NavLink key={i.href} item={i} path={path} onNavigate={onNavigate} />
          ))}
        </div>
        <div>
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted/80 uppercase">Próximos bloques</p>
          <div className="space-y-0.5">
            {UPCOMING_NAV.map((i) => (
              <NavLink key={i.href} item={i} path={path} locked onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </nav>
      <div className="space-y-0.5 border-t border-line px-3 py-3">
        <a
          href={dataEdgeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-teal-700 hover:bg-tint"
        >
          <ExternalLink className="size-4" /> Más herramientas de Data Edge
        </a>
        <NavLink item={{ href: "/configuracion", label: "Configuración", icon: Settings }} path={path} onNavigate={onNavigate} />
        <form action={signOut}>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-tint-2 hover:text-ink">
            <LogOut className="size-4 text-muted" /> Cerrar sesión
          </button>
        </form>
        <p className="truncate px-3 pt-2 text-xs text-muted">{name}</p>
      </div>
    </div>
  );
}

function QuickActions({ className, compact }: { className?: string; compact?: boolean }) {
  const { openTransaction, openPlanned, openEvent, openLoan, openObligation } = useAppData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actions = [
    { label: "Registrar gasto", icon: ArrowUpRight, tone: "text-out-ink bg-series-out/10", run: () => openTransaction({ kind: "expense" }) },
    { label: "Registrar ingreso", icon: ArrowDownLeft, tone: "text-teal-700 bg-teal-50", run: () => openTransaction({ kind: "income" }) },
    { label: "Transferencia", icon: ArrowLeftRight, tone: "text-navy-700 bg-navy-900/5", run: () => openTransaction({ kind: "transfer" }) },
    { label: "Nueva obligación o deuda", icon: ReceiptText, tone: "text-navy-700 bg-navy-900/5", run: () => openObligation({}) },
    { label: "Préstamo (presté o me prestaron)", icon: HandCoins, tone: "text-navy-700 bg-navy-900/5", run: () => openLoan({}) },
    { label: "Programar ingreso", icon: CalendarClock, tone: "text-teal-700 bg-teal-50", run: () => openPlanned({ kind: "income" }) },
    { label: "Programar gasto o pago", icon: CalendarClock, tone: "text-out-ink bg-series-out/10", run: () => openPlanned({ kind: "expense" }) },
    { label: "Nuevo evento", icon: CalendarPlus, tone: "text-navy-700 bg-navy-900/5", run: () => openEvent({}) },
  ];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Acción rápida"
        className={cn(
          "grid place-items-center rounded-2xl bg-primary text-on-primary shadow-[0_8px_20px_-10px_rgb(30_42_59/0.35)] transition-transform hover:opacity-90 active:scale-95",
          compact ? "size-13" : "h-10 grid-flow-col gap-2 px-4 text-sm font-semibold",
        )}
      >
        <Plus className={cn("transition-transform duration-200", open && "rotate-45", compact ? "size-6" : "size-5")} strokeWidth={2.6} />
        {!compact && "Registrar"}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-40 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop animate-scale-in",
            compact ? "bottom-[calc(100%+12px)] right-0 origin-bottom-right" : "top-[calc(100%+8px)] right-0 origin-top-right",
          )}
        >
          {actions.map((a) => (
            <button
              key={a.label}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                a.run();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-ink hover:bg-canvas"
            >
              <span className={cn("grid size-8 place-items-center rounded-lg", a.tone)}>
                <a.icon className="size-4" />
              </span>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  name,
  todayLabel,
  theme,
  children,
}: {
  name: string;
  todayLabel: string;
  theme: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);

  // La paleta también debe aplicar a modales y avisos (se renderizan fuera de este contenedor)
  useEffect(() => {
    const html = document.documentElement;
    if (theme && theme !== "data-edge") html.dataset.theme = theme;
    else delete html.dataset.theme;
    return () => {
      delete html.dataset.theme;
    };
  }, [theme]);

  useEffect(() => setDrawer(false), [path]);

  const bottom = [
    { href: "/inicio", label: "Inicio", icon: LayoutDashboard },
    { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
    { href: "/obligaciones", label: "Obligaciones", icon: ReceiptText },
    { href: "/flujo-de-caja", label: "Flujo", icon: Waves },
    { href: "/calendario", label: "Calendario", icon: CalendarDays },
  ];

  return (
    <div className="min-h-dvh bg-canvas lg:pl-[248px]" data-theme-root="" data-theme={theme !== "data-edge" ? theme : undefined}>
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-card-border bg-card lg:block">
        <SidebarContent path={path} name={name} />
      </aside>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/inicio">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="grid size-10 place-items-center rounded-xl text-ink hover:bg-card"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Menú lateral móvil */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/25 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 w-[280px] bg-card shadow-pop animate-[fade-up_0.2s_both]">
            <button
              type="button"
              onClick={() => setDrawer(false)}
              className="absolute top-5 right-4 grid size-9 place-items-center rounded-full text-muted hover:bg-tint-2"
              aria-label="Cerrar menú"
            >
              <X className="size-5" />
            </button>
            <SidebarContent path={path} name={name} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {/* Barra superior escritorio */}
      <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-line bg-canvas/85 px-10 backdrop-blur lg:flex">
        <p className="text-xs font-medium text-muted first-letter:uppercase">{todayLabel}</p>
        <QuickActions />
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16">{children}</main>

      {/* Acción rápida flotante (móvil): fuera de la barra para que las pestañas queden simétricas */}
      <div className="fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 lg:hidden">
        <QuickActions compact />
      </div>

      {/* Navegación inferior móvil */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-card-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navegación rápida"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-1">
          {bottom.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              aria-current={isActive(path, b.href) ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                isActive(path, b.href) ? "text-teal-700" : "text-muted",
              )}
            >
              <span className={cn("grid h-6 w-10 place-items-center rounded-full transition-colors", isActive(path, b.href) && "bg-pastel-teal")}>
                <b.icon className="size-[18px]" strokeWidth={2.1} />
              </span>
              <span className="max-w-full truncate">{b.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
