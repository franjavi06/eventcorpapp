import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Plus } from "lucide-react";

import { FilterTabs } from "@/components/shared/filter-tabs";
import { SearchForm } from "@/components/shared/search-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstValues } from "@/lib/params";
import { idParamSchema } from "@/lib/validations/common";
import { getEvento } from "@/modules/eventos/services/evento.service";
import { SorteosTable } from "@/modules/sorteos/components/sorteos-table";
import {
  SORTEO_ESTADOS,
  sorteoListQuerySchema,
} from "@/modules/sorteos/schemas/sorteo.schema";

export const metadata = { title: "Sorteos" };

type Props = PageProps<"/eventos/[id]/sorteos">;

const ESTADO_OPTIONS = [
  { value: "all", label: "Todos" },
  ...SORTEO_ESTADOS.map((e) => ({
    value: e,
    label: e.charAt(0) + e.slice(1).toLowerCase(),
  })),
] as const;

async function SorteosContent({ params, searchParams }: Props) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const eventoId = parsed.data.id;

  const evento = await getEvento(eventoId).catch(() => null);
  if (!evento) notFound();

  const query = sorteoListQuerySchema.parse(firstValues(await searchParams));
  const basePath = `/eventos/${eventoId}/sorteos`;

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
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sorteos</h1>
            <p className="text-sm text-muted-foreground">
              {evento.nombre} · <span className="font-mono">{evento.codigo}</span>
            </p>
          </div>
        </div>
        <Link
          href={`/eventos/${eventoId}/sorteos/nuevo`}
          className={buttonVariants()}
        >
          <Plus className="size-4" />
          Nuevo sorteo
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchForm
          action={basePath}
          defaultValue={query.q}
          placeholder="Nombre o descripción…"
          extraParams={
            query.estado !== "all" ? { estado: query.estado } : undefined
          }
        />
        <FilterTabs
          basePath={basePath}
          paramName="estado"
          options={ESTADO_OPTIONS}
          current={query.estado}
          params={{ q: query.q }}
        />
      </div>

      <SorteosTable eventoId={eventoId} query={query} />
    </div>
  );
}

export default function SorteosPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SorteosContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
