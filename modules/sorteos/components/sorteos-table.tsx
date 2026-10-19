import Link from "next/link";
import {
  ClipboardCheck,
  Gift,
  ListFilter,
  Settings2,
  Trophy,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import type { SorteoListQuery } from "@/modules/sorteos/schemas/sorteo.schema";
import { listSorteos } from "@/modules/sorteos/services/sorteo.service";

const ESTADO_STYLE: Record<string, string> = {
  BORRADOR: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  ACTIVO: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  FINALIZADO: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
  CANCELADO: "border-rose-500/20 bg-rose-500/10 text-rose-500",
};

export async function SorteosTable({
  eventoId,
  query,
}: {
  eventoId: string;
  query: SorteoListQuery;
}) {
  const { data: sorteos, total, page, pageSize } = await listSorteos(
    eventoId,
    query,
  );

  if (sorteos.length === 0) {
    return (
      <EmptyState
        title="Sin sorteos"
        description="Crea el primer sorteo para este evento."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sorteos.map((s) => (
          <div
            key={s.id}
            className="flex flex-col justify-between rounded-3xl border bg-card p-6 transition-all hover:border-indigo-500/40"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${ESTADO_STYLE[s.estado] ?? ESTADO_STYLE.BORRADOR}`}
                >
                  {s.estado}
                </span>
                <div className="flex items-center gap-2">
                  {s._count.ejecuciones > 0 && (
                    <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                      Ejecutado
                    </span>
                  )}
                  <span className="rounded-lg border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    #{s.orden}
                  </span>
                </div>
              </div>

              <h3 className="mt-3 flex items-center gap-2 text-xl font-bold text-foreground">
                <Gift className="size-5 shrink-0 text-indigo-500" />
                {s.nombre}
              </h3>
              {s.descripcion && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {s.descripcion}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-500">
                  <Trophy className="size-3.5" />
                  {s.cantidadGanadores} ganador
                  {s.cantidadGanadores === 1 ? "" : "es"}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    s.asistenciaObligatoria
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <ClipboardCheck className="size-3.5" />
                  Asistencia{" "}
                  {s.asistenciaObligatoria ? "obligatoria" : "opcional"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-500">
                  <ListFilter className="size-3.5" />
                  {s._count.reglas} regla{s._count.reglas === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end border-t pt-4">
              <Link
                href={`/eventos/${eventoId}/sorteos/${s.id}`}
                className={buttonVariants({ size: "sm" })}
              >
                <Settings2 className="size-3.5" />
                Ver sorteo
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        basePath={`/eventos/${eventoId}/sorteos`}
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ q: query.q, estado: query.estado }}
      />
    </div>
  );
}
