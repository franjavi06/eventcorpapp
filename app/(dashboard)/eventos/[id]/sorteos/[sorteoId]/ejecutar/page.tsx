import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ClipboardCheck, Sparkles, Timer, Trophy } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { sorteoIdParamsSchema } from "@/modules/sorteos/schemas/sorteo.schema";
import { EjecucionPanel } from "@/modules/sorteos/components/ejecucion-panel";
import { listEjecuciones } from "@/modules/sorteos/services/ejecucion.service";
import { getSorteo } from "@/modules/sorteos/services/sorteo.service";

export const metadata = { title: "Ejecutar sorteo" };

async function EjecutarSorteoContent({
  params,
}: {
  params: PageProps<"/eventos/[id]/sorteos/[sorteoId]/ejecutar">["params"];
}) {
  const parsed = sorteoIdParamsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const sorteo = await getSorteo(parsed.data.sorteoId).catch(() => null);
  if (!sorteo || sorteo.eventoId !== parsed.data.id) notFound();

  const ejecuciones = await listEjecuciones(sorteo.id);
  const completada = ejecuciones.find((e) => e.estado === "COMPLETADA");
  const ganadoresIniciales =
    completada?.ganadores.map((g) => ({
      codigo: g.participante.empleado.codigo,
      nombre: `${g.participante.empleado.nombres} ${g.participante.empleado.apellidos}`,
      empresa: g.participante.empleado.empresa.nombre,
      puesto: g.participante.empleado.puesto,
      departamento: g.participante.empleado.departamento,
    })) ?? [];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/eventos/${parsed.data.id}/sorteos/${sorteo.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Sorteo
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {sorteo.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sorteo.evento.nombre} ·{" "}
            <span className="font-mono">{sorteo.evento.codigo}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-500">
          <Trophy className="size-3.5" />
          {sorteo.cantidadGanadores} ganador
          {sorteo.cantidadGanadores === 1 ? "" : "es"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          <ClipboardCheck className="size-3.5" />
          Asistencia{" "}
          {sorteo.asistenciaObligatoria ? "obligatoria" : "opcional"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-500">
          <Sparkles className="size-3.5" />
          Revelación{" "}
          {sorteo.modoRevelacion === "MANUAL" ? "manual" : "automática"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
          <Timer className="size-3.5" />
          {sorteo.duracionAnimacionSegundos}s por ganador
        </span>
      </div>

      <EjecucionPanel
        eventoId={sorteo.eventoId}
        sorteoId={sorteo.id}
        nombre={sorteo.nombre}
        descripcion={sorteo.descripcion}
        estado={sorteo.estado}
        cantidadGanadores={sorteo.cantidadGanadores}
        modoRevelacion={sorteo.modoRevelacion}
        duracionAnimacionSegundos={sorteo.duracionAnimacionSegundos}
        ganadoresIniciales={ganadoresIniciales}
      />
    </div>
  );
}

export default function EjecutarSorteoPage({
  params,
}: PageProps<"/eventos/[id]/sorteos/[sorteoId]/ejecutar">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EjecutarSorteoContent params={params} />
    </Suspense>
  );
}
