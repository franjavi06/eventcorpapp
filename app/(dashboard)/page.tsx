import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Plus,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";

import { EmpresaLogo } from "@/components/shared/empresa-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getReporteGlobal } from "@/modules/reportes/services/reporte.service";

async function DashboardOverview() {
  await connection();

  const [reporte, empresasActivas, empresasList, eventoDestacado] =
    await Promise.all([
      getReporteGlobal(),
      prisma.empresa.count({ where: { activo: true } }),
      prisma.empresa.findMany({
        orderBy: { nombre: "asc" },
        take: 6,
        select: {
          id: true,
          codigo: true,
          nombre: true,
          activo: true,
          _count: { select: { empleados: true } },
        },
      }),
      prisma.evento.findFirst({
        where: { estado: { in: ["ACTIVO", "BORRADOR"] } },
        orderBy: [{ estado: "asc" }, { fechaInicio: "asc" }],
        select: {
          id: true,
          codigo: true,
          nombre: true,
          ubicacion: true,
          fechaInicio: true,
          estado: true,
        },
      }),
    ]);

  const { totales } = reporte;
  const activosCount = totales.eventosPorEstado.ACTIVO ?? 0;

  let asistenciasDestacado = 0;
  if (eventoDestacado) {
    asistenciasDestacado = await prisma.asistencia.count({
      where: { participante: { eventoId: eventoDestacado.id } },
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-6 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Empresas
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {totales.empresas}
              </p>
            </div>
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-500">
              <Building2 className="size-6" />
            </div>
          </div>
          <p className="mt-4 flex items-center text-xs text-muted-foreground">
            <span className="mr-1 font-semibold text-emerald-500">
              {empresasActivas}/{totales.empresas}
            </span>
            activas en el grupo
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Empleados
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {totales.empleados}
              </p>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-500">
              <Users className="size-6" />
            </div>
          </div>
          <p className="mt-4 flex items-center text-xs text-muted-foreground">
            <span className="mr-1 font-semibold text-emerald-500">
              {totales.empleadosActivos}
            </span>
            colaboradores activos
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Eventos Activos
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {activosCount}
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-500">
              <CalendarDays className="size-6" />
            </div>
          </div>
          <p className="mt-4 truncate text-xs text-muted-foreground">
            <span className="font-semibold text-blue-500">
              {eventoDestacado?.ubicacion ?? `${totales.eventos} en total`}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sorteos Realizados
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {totales.sorteosFinalizados}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-500">
              <Trophy className="size-6" />
            </div>
          </div>
          <p className="mt-4 flex items-center text-xs text-muted-foreground">
            <span className="mr-1 font-semibold text-amber-500">
              {totales.ganadores} ganadores
            </span>
            adjudicados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white shadow-xl lg:col-span-2">
          {eventoDestacado ? (
            <div className="relative z-10">
              <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                {eventoDestacado.estado === "ACTIVO"
                  ? "Evento Principal Activo"
                  : `Próximo Evento · ${eventoDestacado.estado}`}
              </span>
              <h2 className="mt-4 text-2xl font-black">
                {eventoDestacado.nombre}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-indigo-100">
                Ubicación:{" "}
                <span className="font-semibold text-white">
                  {eventoDestacado.ubicacion ?? "Por definir"}
                </span>{" "}
                | Fecha: {formatDateTime(eventoDestacado.fechaInicio)}
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href={`/eventos/${eventoDestacado.id}/sorteos`}
                  className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg transition-all hover:bg-slate-100"
                >
                  <Trophy className="size-4" />
                  <span>Lanzar Sorteos</span>
                </Link>
                <Link
                  href={`/eventos/${eventoDestacado.id}/check-in`}
                  className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-800/60 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-800/80"
                >
                  <UserCheck className="size-4" />
                  <span>Ver Check-in ({asistenciasDestacado})</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                Sin eventos activos
              </span>
              <h2 className="mt-4 text-2xl font-black">
                Organiza tu próximo evento corporativo
              </h2>
              <p className="mt-2 max-w-xl text-sm text-indigo-100">
                Asocia empresas del grupo, registra check-in de colaboradores y
                configura sorteos con reglas de elegibilidad.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/eventos/nuevo"
                  className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg transition-all hover:bg-slate-100"
                >
                  <Plus className="size-4" />
                  <span>Crear Evento</span>
                </Link>
                <Link
                  href="/eventos"
                  className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-800/60 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-800/80"
                >
                  <CalendarDays className="size-4" />
                  <span>Ver Eventos</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-3xl border bg-card p-6">
          <div>
            <h3 className="mb-4 text-lg font-bold text-foreground">
              Empresas del Grupo
            </h3>
            {empresasList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay empresas registradas.
              </p>
            ) : (
              <div className="space-y-3">
                {empresasList.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/empresas/${emp.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:border-indigo-500/40"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <EmpresaLogo
                        empresaCodigo={emp.codigo}
                        nombre={emp.nombre}
                        size="sm"
                      />
                      <span className="truncate text-sm font-medium text-foreground">
                        {emp.nombre}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-500">
                      {emp._count.empleados} emp.
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/empresas"
            className="mt-6 flex items-center justify-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-600"
          >
            <span>Ver todas las empresas</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Administración de eventos corporativos y sorteos
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        }
      >
        <DashboardOverview />
      </Suspense>
    </div>
  );
}
