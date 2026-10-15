import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { sorteoIdParamsSchema } from "@/modules/sorteos/schemas/sorteo.schema";
import { getSorteo } from "@/modules/sorteos/services/sorteo.service";
import { ElegiblesPreview } from "@/modules/sorteos/components/elegibles-preview";
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

  return (
    <div className="space-y-6">
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
        eventoId={sorteo.eventoId}
        sorteoId={sorteo.id}
        defaultValues={{
          nombre: sorteo.nombre,
          descripcion: sorteo.descripcion ?? "",
          cantidadGanadores: sorteo.cantidadGanadores,
          orden: sorteo.orden,
          estado: sorteo.estado,
          asistenciaObligatoria: sorteo.asistenciaObligatoria,
        }}
      />

      <Separator />

      <ReglaBuilder
        eventoId={sorteo.eventoId}
        sorteoId={sorteo.id}
        reglas={sorteo.reglas}
      />

      <ElegiblesPreview eventoId={sorteo.eventoId} sorteoId={sorteo.id} />
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
