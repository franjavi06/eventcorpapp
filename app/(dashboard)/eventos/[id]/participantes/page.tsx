import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

import { FilterTabs } from "@/components/shared/filter-tabs";
import { SearchForm } from "@/components/shared/search-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstValues } from "@/lib/params";
import { idParamSchema } from "@/lib/validations/common";
import { getEvento } from "@/modules/eventos/services/evento.service";
import { AddParticipanteDialog } from "@/modules/participantes/components/add-participante-dialog";
import { ParticipantesTable } from "@/modules/participantes/components/participantes-table";
import { participanteListQuerySchema } from "@/modules/participantes/schemas/participante.schema";

export const metadata = { title: "Participantes" };

type Props = PageProps<"/eventos/[id]/participantes">;

const ASISTENCIA_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "si", label: "Con asistencia" },
  { value: "no", label: "Sin asistencia" },
] as const;

const SORTEOS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "elegibles", label: "Elegibles" },
  { value: "excluidos", label: "Excluidos" },
] as const;

async function ParticipantesContent({ params, searchParams }: Props) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const eventoId = parsed.data.id;

  const query = participanteListQuerySchema.parse(
    firstValues(await searchParams),
  );
  const evento = await getEvento(eventoId).catch(() => null);
  if (!evento) notFound();

  const basePath = `/eventos/${eventoId}/participantes`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/eventos/${eventoId}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft className="size-4" />
            Evento
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Participantes
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <AddParticipanteDialog eventoId={eventoId} />
          <Link
            href={`/eventos/${eventoId}/check-in`}
            className={buttonVariants()}
          >
            <ClipboardCheck className="size-4" />
            Check-in
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchForm
          action={basePath}
          defaultValue={query.q}
          placeholder="Código, nombre, identificación…"
          extraParams={{
            ...(query.asistencia !== "all" && { asistencia: query.asistencia }),
            ...(query.sorteos !== "all" && { sorteos: query.sorteos }),
            ...(query.empresaId && { empresaId: query.empresaId }),
          }}
        >
          <select
            name="empresaId"
            defaultValue={query.empresaId ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Filtrar por empresa"
          >
            <option value="">Todas las empresas</option>
            {evento.empresas.map((ee) => (
              <option key={ee.empresaId} value={ee.empresaId}>
                {ee.empresa.codigo} — {ee.empresa.nombre}
              </option>
            ))}
          </select>
        </SearchForm>
        <FilterTabs
          basePath={basePath}
          paramName="asistencia"
          options={ASISTENCIA_OPTIONS}
          current={query.asistencia}
          params={{
            q: query.q,
            empresaId: query.empresaId,
            sorteos: query.sorteos,
          }}
        />
        <FilterTabs
          basePath={basePath}
          paramName="sorteos"
          options={SORTEOS_OPTIONS}
          current={query.sorteos}
          params={{
            q: query.q,
            empresaId: query.empresaId,
            asistencia: query.asistencia,
          }}
        />
      </div>

      <ParticipantesTable eventoId={eventoId} query={query} />
    </div>
  );
}

export default function ParticipantesPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ParticipantesContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
