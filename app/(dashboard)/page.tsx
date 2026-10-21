import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Gift,
  Play,
  Plus,
  Settings2,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";

import { EmpleadoAvatar } from "@/components/shared/empleado-avatar";
import { EmpresaLogo } from "@/components/shared/empresa-logo";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getReporteGlobal } from "@/modules/reportes/services/reporte.service";

const SORTEO_ESTADO_STYLE: Record<string, string> = {
  BORRADOR: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  ACTIVO: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  FINALIZADO: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
  CANCELADO: "border-rose-500/20 bg-rose-500/10 text-rose-500",
};

async function DashboardOverview() {
  await connection();

  const [
    reporte,
    empresasActivas,
    empresasList,
    eventoActivoOBorrador,
    ultimosGanadores,
    ultimasAsistencias,
  ] = await Promise.all([
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
        empresas: {
          select: {
            empresa: {
              select: { id: true, codigo: true, nombre: true, activo: true },
            },
          },
          orderBy: { empresa: { nombre: "asc" } },
        },
        sorteos: {
          orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
          take: 6,
          select: {
            id: true,
            nombre: true,
            orden: true,
            estado: true,
            cantidadGanadores: true,
            _count: { select: { ejecuciones: true } },
          },
        },
      },
    }),
    prisma.sorteoGanador.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        participante: {
          include: {
            empleado: {
              select: {
                codigo: true,
                nombres: true,
                apellidos: true,
                puesto: true,
                departamento: true,
                empresa: { select: { codigo: true, nombre: true } },
              },
            },
          },
        },
        ejecucion: {
          include: {
            sorteo: { select: { id: true, nombre: true, eventoId: true } },
          },
        },
      },
    }),
    prisma.asistencia.findMany({
      orderBy: { registradoAt: "desc" },
      take: 5,
      include: {
        participante: {
          include: {
            empleado: {
              select: {
                codigo: true,
                nombres: true,
                apellidos: true,
                puesto: true,
                empresa: { select: { codigo: true, nombre: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const eventoDestacado = eventoActivoOBorrador;
  const { totales } = reporte;
  const activosCount = totales.eventosPorEstado.ACTIVO ?? 0;

  let participantesDestacado = 0;
  let asistenciasDestacado = 0;
  let empresasProgreso: {
    id: string;
    codigo: string;
    nombre: string;
    participantes: number;
    asistencias: number;
    porcentaje: number;
  }[] = [];

  if (eventoDestacado) {
    const [totalPart, totalAsist, desglose] = await Promise.all([
      prisma.eventoParticipante.count({
        where: { eventoId: eventoDestacado.id },
      }),
      prisma.asistencia.count({
        where: { participante: { eventoId: eventoDestacado.id } },
      }),
      Promise.all(
        eventoDestacado.empresas.map(async ({ empresa }) => {
          const [pCount, aCount] = await Promise.all([
            prisma.eventoParticipante.count({
              where: { eventoId: eventoDestacado.id, empresaId: empresa.id },
            }),
            prisma.eventoParticipante.count({
              where: {
                eventoId: eventoDestacado.id,
                empresaId: empresa.id,
                asistencia: { isNot: null },
              },
            }),
          ]);
          return {
            id: empresa.id,
            codigo: empresa.codigo,
            nombre: empresa.nombre,
            participantes: pCount,
            asistencias: aCount,
            porcentaje: pCount > 0 ? Math.round((aCount / pCount) * 100) : 0,
          };
        }),
      ),
    ]);
    participantesDestacado = totalPart;
    asistenciasDestacado = totalAsist;
    empresasProgreso = desglose;
  }

  const porcentajeGeneral =
    participantesDestacado > 0
      ? Math.round((asistenciasDestacado / participantesDestacado) * 100)
      : 0;

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
            <div className="relative z-10 flex h-full flex-col justify-between gap-6">
              <div>
                <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  {eventoDestacado.estado === "ACTIVO"
                    ? "Evento Principal Activo"
                    : `Próximo Evento · ${eventoDestacado.estado}`}
                </span>
                <h2 className="mt-4 text-2xl font-black md:text-3xl">
                  {eventoDestacado.nombre}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-indigo-100">
                  Ubicación:{" "}
                  <span className="font-semibold text-white">
                    {eventoDestacado.ubicacion ?? "Por definir"}
                  </span>{" "}
                  | Fecha: {formatDateTime(eventoDestacado.fechaInicio)}
                </p>

                <div className="mt-5 max-w-xl rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xs">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Asistencia en vivo (Check-in)</span>
                    <span>
                      {asistenciasDestacado} / {participantesDestacado} (
                      {porcentajeGeneral}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-indigo-950/50">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${Math.min(100, porcentajeGeneral)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/eventos/${eventoDestacado.id}/sorteos`}
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-lg transition-all hover:bg-slate-100"
                >
                  <Trophy className="size-4" />
                  <span>Lanzar Sorteos</span>
                </Link>
                <Link
                  href={`/eventos/${eventoDestacado.id}/check-in`}
                  className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-800/60 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-800/80"
                >
                  <UserCheck className="size-4" />
                  <span>Check-in ({asistenciasDestacado})</span>
                </Link>
                <Link
                  href={`/eventos/${eventoDestacado.id}/participantes`}
                  className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-800/60 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-800/80"
                >
                  <Users className="size-4" />
                  <span>Participantes</span>
                </Link>
                <Link
                  href={`/eventos/${eventoDestacado.id}/reporte`}
                  className="flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-800/60 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-800/80"
                >
                  <BarChart3 className="size-4" />
                  <span>Reporte</span>
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

      {eventoDestacado && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Asistencia por Empresa
                </h3>
                <p className="text-xs text-muted-foreground">
                  {eventoDestacado.nombre}
                </p>
              </div>
              <Link
                href={`/eventos/${eventoDestacado.id}/check-in`}
                className="text-xs font-bold text-indigo-500 hover:underline"
              >
                Ir a Check-in →
              </Link>
            </div>
            {empresasProgreso.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este evento aún no tiene empresas habilitadas.
              </p>
            ) : (
              <div className="space-y-4">
                {empresasProgreso.map((emp) => (
                  <div key={emp.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <EmpresaLogo
                          empresaCodigo={emp.codigo}
                          nombre={emp.nombre}
                          size="xs"
                        />
                        <span className="truncate font-semibold text-foreground">
                          {emp.nombre}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {emp.asistencias} / {emp.participantes} (
                        <span className="font-semibold text-foreground">
                          {emp.porcentaje}%
                        </span>
                        )
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${Math.min(100, emp.porcentaje)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Sorteos del Evento
                </h3>
                <p className="text-xs text-muted-foreground">
                  {eventoDestacado.nombre}
                </p>
              </div>
              <Link
                href={`/eventos/${eventoDestacado.id}/sorteos`}
                className="text-xs font-bold text-indigo-500 hover:underline"
              >
                Ver todos →
              </Link>
            </div>
            {eventoDestacado.sorteos.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  Aún no hay sorteos configurados para este evento.
                </p>
                <Link
                  href={`/eventos/${eventoDestacado.id}/sorteos/nuevo`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  <Plus className="size-3.5" />
                  Crear sorteo
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {eventoDestacado.sorteos.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Gift className="size-4 shrink-0 text-indigo-500" />
                        <p className="truncate text-sm font-bold text-foreground">
                          {s.nombre}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SORTEO_ESTADO_STYLE[s.estado] ?? SORTEO_ESTADO_STYLE.BORRADOR}`}
                        >
                          {s.estado}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {s.cantidadGanadores} premio
                        {s.cantidadGanadores === 1 ? "" : "s"} · Orden #{s.orden}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Link
                        href={`/eventos/${eventoDestacado.id}/sorteos/${s.id}`}
                        className={buttonVariants({
                          size: "sm",
                          variant: "ghost",
                        })}
                        title="Configurar sorteo"
                      >
                        <Settings2 className="size-3.5" />
                      </Link>
                      <Link
                        href={`/eventos/${eventoDestacado.id}/sorteos/${s.id}/ejecutar`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        <Play className="size-3.5" />
                        Ruleta
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Trophy className="size-5 text-amber-500" />
              Últimos Ganadores Adjudicados
            </h3>
            <Link
              href="/reportes"
              className="text-xs font-bold text-indigo-500 hover:underline"
            >
              Ver reportes →
            </Link>
          </div>
          {ultimosGanadores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no se han ejecutado sorteos con ganadores.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ultimosGanadores.map((g) => {
                const emp = g.participante.empleado;
                const cargo = [emp.puesto, emp.departamento]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={g.id}
                    className="flex items-start gap-3 rounded-2xl border p-3.5"
                  >
                    <EmpleadoAvatar
                      empresaCodigo={emp.empresa.codigo}
                      empleadoCodigo={emp.codigo}
                      nombre={`${emp.nombres} ${emp.apellidos}`}
                      size="md"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-foreground">
                          {emp.nombres} {emp.apellidos}
                        </p>
                      </div>
                      {cargo && (
                        <p className="truncate text-xs font-medium text-indigo-500">
                          {cargo}
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <EmpresaLogo
                          empresaCodigo={emp.empresa.codigo}
                          nombre={emp.empresa.nombre}
                          size="xs"
                        />
                        <span className="truncate">{emp.empresa.nombre}</span>
                        <span>·</span>
                        <span className="font-mono">{emp.codigo}</span>
                      </p>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <Trophy className="size-3" />
                        {g.ejecucion.sorteo.nombre}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Clock className="size-5 text-emerald-500" />
              Recién Llegados
            </h3>
          </div>
          {ultimasAsistencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay registros de check-in.
            </p>
          ) : (
            <div className="space-y-3">
              {ultimasAsistencias.map((a) => {
                const emp = a.participante.empleado;
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-2xl border p-3"
                  >
                    <EmpleadoAvatar
                      empresaCodigo={emp.empresa.codigo}
                      empleadoCodigo={emp.codigo}
                      nombre={`${emp.nombres} ${emp.apellidos}`}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {emp.nombres} {emp.apellidos}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <EmpresaLogo
                          empresaCodigo={emp.empresa.codigo}
                          nombre={emp.empresa.nombre}
                          size="xs"
                        />
                        <span className="truncate">{emp.empresa.nombre}</span>
                        <span>·</span>
                        <span className="font-mono">{emp.codigo}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDateTime(a.registradoAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Administración de eventos corporativos y sorteos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/empleados/carga"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileSpreadsheet className="size-4" />
            Carga masiva
          </Link>
          <Link
            href="/empresas/nueva"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Building2 className="size-4" />
            Nueva empresa
          </Link>
          <Link href="/eventos/nuevo" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Nuevo evento
          </Link>
        </div>
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
