import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  MapPin,
  Settings2,
  Trophy,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { EventoListQuery } from "@/modules/eventos/schemas/evento.schema";
import { listEventos } from "@/modules/eventos/services/evento.service";

const ESTADO_STYLE: Record<string, string> = {
  BORRADOR: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  ACTIVO: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  FINALIZADO: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
  CANCELADO: "border-rose-500/20 bg-rose-500/10 text-rose-500",
};

export async function EventosTable({ query }: { query: EventoListQuery }) {
  const { data: eventos, total, page, pageSize } = await listEventos(query);

  if (eventos.length === 0) {
    return (
      <EmptyState
        title="No hay eventos"
        description="Crea el primer evento o ajusta los filtros."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {eventos.map((evento) => (
          <div
            key={evento.id}
            className="flex flex-col justify-between rounded-3xl border bg-card p-6 transition-all hover:border-indigo-500/40"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${ESTADO_STYLE[evento.estado] ?? ESTADO_STYLE.BORRADOR}`}
                >
                  {evento.estado}
                </span>
                <span className="rounded-lg border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {evento.codigo}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-bold text-foreground">
                {evento.nombre}
              </h3>

              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-indigo-500" />
                  <span>
                    Ubicación:{" "}
                    <span className="font-semibold text-foreground">
                      {evento.ubicacion ?? "Por definir"}
                    </span>
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-indigo-500" />
                  <span>
                    {formatDateTime(evento.fechaInicio)} →{" "}
                    {formatDateTime(evento.fechaFin)}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-500">
                  <Building2 className="size-3.5" />
                  {evento._count.empresas} empresa
                  {evento._count.empresas === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                  <Trophy className="size-3.5" />
                  {evento._count.sorteos} sorteo
                  {evento._count.sorteos === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/eventos/${evento.id}/check-in`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ClipboardCheck className="size-3.5" />
                  Check-in
                </Link>
                <Link
                  href={`/eventos/${evento.id}/sorteos`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Trophy className="size-3.5" />
                  Sorteos
                </Link>
                <Link
                  href={`/eventos/${evento.id}/reporte`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <BarChart3 className="size-3.5" />
                  Reporte
                </Link>
              </div>
              <Link
                href={`/eventos/${evento.id}`}
                className={buttonVariants({ size: "sm" })}
              >
                <Settings2 className="size-3.5" />
                Editar
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        basePath="/eventos"
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ q: query.q, estado: query.estado }}
      />
    </div>
  );
}
