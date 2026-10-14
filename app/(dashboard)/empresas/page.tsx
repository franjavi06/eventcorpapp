import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { EstadoFilter } from "@/components/shared/estado-filter";
import { SearchForm } from "@/components/shared/search-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstValues } from "@/lib/params";
import { EmpresasTable } from "@/modules/empresas/components/empresas-table";
import { empresaListQuerySchema } from "@/modules/empresas/schemas/empresa.schema";

export const metadata = { title: "Empresas" };

async function EmpresasContent({
  searchParams,
}: {
  searchParams: PageProps<"/empresas">["searchParams"];
}) {
  const query = empresaListQuerySchema.parse(firstValues(await searchParams));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchForm
          action="/empresas"
          defaultValue={query.q}
          placeholder="Código o nombre…"
          extraParams={
            query.activo !== "all" ? { activo: query.activo } : undefined
          }
        />
        <EstadoFilter
          basePath="/empresas"
          activo={query.activo}
          params={{ q: query.q }}
        />
      </div>
      <EmpresasTable query={query} />
    </>
  );
}

export default function EmpresasPage({ searchParams }: PageProps<"/empresas">) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground">
            Empresas del grupo habilitadas para eventos
          </p>
        </div>
        <Link href="/empresas/nueva" className={buttonVariants()}>
          <Plus className="size-4" />
          Nueva empresa
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <EmpresasContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
