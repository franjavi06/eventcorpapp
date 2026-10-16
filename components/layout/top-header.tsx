"use client";

import { usePathname } from "next/navigation";

function getSectionLabel(pathname: string): string {
  if (pathname === "/") return "Panel Principal de Control";
  if (pathname.startsWith("/empresas")) return "Empresas del Grupo";
  if (pathname.startsWith("/empleados")) return "Directorio de Empleados";
  if (pathname.includes("/sorteos")) return "Módulo de Sorteos e Interacción";
  if (pathname.includes("/check-in")) return "Registro de Asistencia (Check-in)";
  if (pathname.includes("/participantes")) return "Participantes y Elegibilidad";
  if (pathname.includes("/auditoria")) return "Historial y Auditoría";
  if (pathname.includes("/reporte") || pathname.startsWith("/reportes"))
    return "Reportes y Métricas";
  if (pathname.startsWith("/eventos")) return "Gestión de Eventos";
  return "EventCorpApp";
}

export function TopHeader() {
  const pathname = usePathname();
  const label = getSectionLabel(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-card/80 px-8 backdrop-blur-md">
      <p className="text-sm font-semibold tracking-tight text-foreground">
        {label}
      </p>
      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
        <span className="mr-2 size-2 animate-pulse rounded-full bg-emerald-500" />
        Sistema Conectado Multi-Empresa
      </span>
    </header>
  );
}
