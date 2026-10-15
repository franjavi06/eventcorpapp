import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { idParamSchema } from "@/lib/validations/common";
import { getEvento } from "@/modules/eventos/services/evento.service";
import { SorteoForm } from "@/modules/sorteos/components/sorteo-form";

export const metadata = { title: "Nuevo sorteo" };

async function NuevoSorteoContent({
  params,
}: {
  params: PageProps<"/eventos/[id]/sorteos/nuevo">["params"];
}) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const evento = await getEvento(parsed.data.id).catch(() => null);
  if (!evento) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo sorteo</h1>
        <p className="text-sm text-muted-foreground">
          {evento.nombre} · <span className="font-mono">{evento.codigo}</span>
        </p>
      </div>
      <SorteoForm eventoId={evento.id} />
    </div>
  );
}

export default function NuevoSorteoPage({
  params,
}: PageProps<"/eventos/[id]/sorteos/nuevo">) {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full max-w-2xl" />}>
      <NuevoSorteoContent params={params} />
    </Suspense>
  );
}
