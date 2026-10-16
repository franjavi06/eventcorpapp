import Link from "next/link";
import { Suspense } from "react";
import { Plus, Upload } from "lucide-react";

import { EstadoFilter } from "@/components/shared/estado-filter";
import { SearchForm } from "@/components/shared/search-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstValues } from "@/lib/params";
import { EmpleadosTable } from "@/modules/empleados/components/empleados-table";
import { empleadoListQuerySchema } from "@/modules/empleados/schemas/empleado.schema";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

export const metadata = { title: "Empleados" };

async function EmpleadosContent({
  searchParams,
}: {
  searchParams: PageProps<"/empleados">["searchParams"];
}) {
  const query = empleadoListQuerySchema.parse(firstValues(await searchParams));
  const empresas = await empresaRepository.findAll();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchForm
          action="/empleados"
          defaultValue={query.q}
          placeholder="Código, nombre o correo…"
          extraParams={
            query.activo !== "all" ? { activo: query.activo } : undefined
          }
        >
          <select
            name="empresaId"
            defaultValue={query.empresaId ?? ""}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Filtrar por empresa"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} — {e.nombre}
              </option>
            ))}
          </select>
        </SearchForm>
        <EstadoFilter
          basePath="/empleados"
          activo={query.activo}
          params={{ q: query.q, empresaId: query.empresaId }}
        />
      </div>
      <EmpleadosTable query={query} />
    </>
  );
}

export default function EmpleadosPage({
  searchParams,
}: PageProps<"/empleados">) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empleados</h1>
          <p className="text-sm text-muted-foreground">
            Colaboradores registrados por empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/empleados/carga"
            className={buttonVariants({ variant: "outline" })}
          >
            <Upload className="size-4" />
            Carga masiva
          </Link>
          <Link href="/empleados/nuevo" className={buttonVariants()}>
            <Plus className="size-4" />
            Nuevo empleado
          </Link>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <EmpleadosContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
