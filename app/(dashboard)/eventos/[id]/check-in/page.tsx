import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { FilterTabs } from "@/components/shared/filter-tabs";
import { SearchForm } from "@/components/shared/search-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstValues } from "@/lib/params";
import { idParamSchema } from "@/lib/validations/common";
import { getEvento } from "@/modules/eventos/services/evento.service";
import { CheckInList } from "@/modules/participantes/components/checkin-list";
import { PoncheForm } from "@/modules/participantes/components/ponche-form";
import { participanteListQuerySchema } from "@/modules/participantes/schemas/participante.schema";

export const metadata = { title: "Check-in" };

const VISTA_OPTIONS = [
  { value: "si", label: "Ponchados" },
  { value: "no", label: "Pendientes" },
] as const;

async function CheckInContent({
  params,
  searchParams,
}: PageProps<"/eventos/[id]/check-in">) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const eventoId = parsed.data.id;

  const evento = await getEvento(eventoId).catch(() => null);
  if (!evento) notFound();

  const query = participanteListQuerySchema.parse(
    firstValues(await searchParams),
  );
  // "Ponchados" es la vista por defecto
  const vista: "si" | "no" = query.asistencia === "no" ? "no" : "si";
  const basePath = `/eventos/${eventoId}/check-in`;
  const empresasHabilitadas = evento.empresas
    .map((ee) => ee.empresa)
    .filter((emp) => emp.activo);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/eventos/${eventoId}/participantes`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Participantes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {evento.nombre} · <span className="font-mono">{evento.codigo}</span>
      </p>

      <PoncheForm
        eventoId={eventoId}
        eventoNombre={evento.nombre}
        empresas={empresasHabilitadas}
      />

      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs
          basePath={basePath}
          paramName="asistencia"
          options={VISTA_OPTIONS}
          current={vista}
          params={{ q: query.q }}
        />
        <SearchForm
          action={basePath}
          defaultValue={query.q}
          placeholder="Código, nombre, identificación…"
          extraParams={{ asistencia: vista }}
        />
      </div>

      <CheckInList eventoId={eventoId} vista={vista} query={query} />
    </div>
  );
}

export default function CheckInPage({
  params,
  searchParams,
}: PageProps<"/eventos/[id]/check-in">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <CheckInContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
