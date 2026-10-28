import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { sorteoIdParamsSchema } from "@/modules/sorteos/schemas/sorteo.schema";
import {
  getSorteo,
  getValoresSugeridosEvento,
} from "@/modules/sorteos/services/sorteo.service";
import { ElegiblesPreview } from "@/modules/sorteos/components/elegibles-preview";
import { EjecucionesHistorial } from "@/modules/sorteos/components/ejecuciones-historial";
import { CuotaBuilder } from "@/modules/sorteos/components/cuota-builder";
import { ReglaBuilder } from "@/modules/sorteos/components/regla-builder";
import { SorteoForm } from "@/modules/sorteos/components/sorteo-form";

async function SorteoDetailContent({
  params,
}: {
  params: PageProps<"/eventos/[id]/sorteos/[sorteoId]">["params"];
}) {
  const parsed = sorteoIdParamsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const sorteo = await getSorteo(parsed.data.sorteoId).catch(() => null);
  if (!sorteo || sorteo.eventoId !== parsed.data.id) notFound();

  const sugerencias = await getValoresSugeridosEvento(sorteo.eventoId);
  const bloqueado = sorteo.ejecuciones.length > 0;

  return (
    <div className="space-y-6">
      {bloqueado && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
          Este sorteo ya fue ejecutado. La configuración y las reglas están en
          solo lectura.
        </div>
      )}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {sorteo.nombre}
        </h1>
        <Badge>{sorteo.estado}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {sorteo.evento.nombre} · {sorteo.cantidadGanadores} ganador
        {sorteo.cantidadGanadores === 1 ? "" : "es"} · asistencia{" "}
        {sorteo.asistenciaObligatoria ? "obligatoria" : "opcional"}
      </p>

      <SorteoForm
        key={`${sorteo.id}-${sorteo.cantidadGanadores}-${sorteo.updatedAt.toISOString()}`}
        eventoId={sorteo.eventoId}
        sorteoId={sorteo.id}
        defaultValues={{
          nombre: sorteo.nombre,
          descripcion: sorteo.descripcion ?? "",
          cantidadGanadores: sorteo.cantidadGanadores,
          orden: sorteo.orden,
          estado: sorteo.estado,
          asistenciaObligatoria: sorteo.asistenciaObligatoria,
          modoRevelacion: sorteo.modoRevelacion,
          duracionAnimacionSegundos: sorteo.duracionAnimacionSegundos,
        }}
      />

      <Separator />

      <ReglaBuilder
        eventoId={sorteo.eventoId}
        sorteoId={sorteo.id}
        reglas={sorteo.reglas}
        sugerencias={sugerencias}
      />

      <CuotaBuilder
        eventoId={sorteo.eventoId}
        sorteoId={sorteo.id}
        cuotas={sorteo.cuotas}
        sugerencias={sugerencias}
      />

      <ElegiblesPreview eventoId={sorteo.eventoId} sorteoId={sorteo.id} />

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4">
        <div>
          <p className="font-semibold">Ruleta y premiación</p>
          <p className="text-sm text-muted-foreground">
            Ejecuta la tómbola y revela los ganadores en pantalla.
          </p>
        </div>
        <Link
          href={`/eventos/${sorteo.eventoId}/sorteos/${sorteo.id}/ejecutar`}
          className={buttonVariants()}
        >
          <Play className="size-4" />
          Ir a la ruleta
        </Link>
      </div>

      <EjecucionesHistorial sorteoId={sorteo.id} />
    </div>
  );
}

export default function SorteoDetailPage({
  params,
}: PageProps<"/eventos/[id]/sorteos/[sorteoId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SorteoDetailContent params={params} />
    </Suspense>
  );
}
