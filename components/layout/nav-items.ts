import {
  BarChart3,
  Building2,
  CalendarDays,
  Gift,
  LayoutDashboard,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/empresas", label: "Empresas", icon: Building2, enabled: true },
  { href: "/empleados", label: "Empleados", icon: Users, enabled: true },
  { href: "/eventos", label: "Eventos", icon: CalendarDays, enabled: true },
  { href: "/sorteos", label: "Sorteos", icon: Gift, enabled: false },
  { href: "/reportes", label: "Reportes", icon: BarChart3, enabled: true },
];
