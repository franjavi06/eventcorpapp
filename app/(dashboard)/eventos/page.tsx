import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { FilterTabs } from "@/components/shared/filter-tabs";
import { SearchForm } from "@/components/shared/search-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstValues } from "@/lib/params";
import { EventosTable } from "@/modules/eventos/components/eventos-table";
import { eventoListQuerySchema } from "@/modules/eventos/schemas/evento.schema";

export const metadata = { title: "Eventos" };

const ESTADO_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "BORRADOR", label: "Borradores" },
  { value: "ACTIVO", label: "Activos" },
  { value: "FINALIZADO", label: "Finalizados" },
  { value: "CANCELADO", label: "Cancelados" },
] as const;

async function EventosContent({
  searchParams,
}: {
  searchParams: PageProps<"/eventos">["searchParams"];
}) {
  const query = eventoListQuerySchema.parse(firstValues(await searchParams));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchForm
          action="/eventos"
          defaultValue={query.q}
          placeholder="Código, nombre o ubicación…"
          extraParams={
            query.estado !== "all" ? { estado: query.estado } : undefined
          }
        />
        <FilterTabs
          basePath="/eventos"
          paramName="estado"
          options={ESTADO_OPTIONS}
          current={query.estado}
          params={{ q: query.q }}
        />
      </div>
      <EventosTable query={query} />
    </>
  );
}

export default function EventosPage({ searchParams }: PageProps<"/eventos">) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
          <p className="text-sm text-muted-foreground">
            Eventos corporativos compartidos entre empresas
          </p>
        </div>
        <Link href="/eventos/nuevo" className={buttonVariants()}>
          <Plus className="size-4" />
          Nuevo evento
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <EventosContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
