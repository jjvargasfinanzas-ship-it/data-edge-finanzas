import {
  ArrowLeftRight, Brain, CalendarDays, CalendarClock, ChartColumn, ChartSpline, CreditCard, FileBarChart, FileUp,
  Landmark, LayoutDashboard, PiggyBank, Scale, Target, TrendingUp, Users, Wallet, Waves, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/tarjetas", label: "Tarjetas", icon: CreditCard },
  { href: "/programados", label: "Programación", icon: CalendarClock },
  { href: "/flujo-de-caja", label: "Flujo de caja", icon: Waves },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
];

export const UPCOMING_NAV: NavItem[] = [
  { href: "/pronto/conciliacion", label: "Conciliación", icon: FileUp },
  { href: "/pronto/presupuesto", label: "Presupuesto", icon: PiggyBank },
  { href: "/pronto/deudas", label: "Deudas", icon: Landmark },
  { href: "/pronto/metas", label: "Metas", icon: Target },
  { href: "/pronto/inversiones", label: "Inversiones", icon: TrendingUp },
  { href: "/pronto/patrimonio", label: "Patrimonio", icon: Scale },
  { href: "/pronto/analisis", label: "Análisis", icon: ChartColumn },
  { href: "/pronto/proyecciones", label: "Proyecciones", icon: ChartSpline },
  { href: "/pronto/familia", label: "Mi familia", icon: Users },
  { href: "/pronto/intelligence", label: "Intelligence", icon: Brain },
  { href: "/pronto/reportes", label: "Reportes", icon: FileBarChart },
];
