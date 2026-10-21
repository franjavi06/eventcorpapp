import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";

import { ActivoToggle } from "@/components/shared/activo-toggle";
import { EmpresaLogo } from "@/components/shared/empresa-logo";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import type { EmpresaListQuery } from "@/modules/empresas/schemas/empresa.schema";
import { listEmpresas } from "@/modules/empresas/services/empresa.service";

export async function EmpresasTable({ query }: { query: EmpresaListQuery }) {
  const { data: empresas, total, page, pageSize } = await listEmpresas(query);

  if (empresas.length === 0) {
    return (
      <EmptyState
        title="No hay empresas"
        description="Crea la primera empresa o ajusta los filtros."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {empresas.map((empresa) => (
          <div
            key={empresa.id}
            className="flex flex-col justify-between rounded-3xl border bg-card p-6 transition-all hover:border-indigo-500/40"
          >
            <div>
              <div className="mb-4 flex items-start justify-between">
                <EmpresaLogo
                  empresaCodigo={empresa.codigo}
                  nombre={empresa.nombre}
                  size="md"
                />
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {empresa.codigo}
                  </span>
                  {empresa.activo ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500">
                      Activa
                    </span>
                  ) : (
                    <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      Inactiva
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-foreground">
                {empresa.nombre}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Clasificación: {empresa.clasificacion ?? "General"}
              </p>
              {empresa.ubicacion && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 text-indigo-500" />
                  <span>{empresa.ubicacion}</span>
                </p>
              )}
            </div>

            <div className="mt-6 space-y-3 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Empleados asignados:
                </span>
                <span className="rounded-lg border px-3 py-1 font-bold text-foreground">
                  {empresa._count.empleados}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Link
                  href={`/empresas/${empresa.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Link>
                <ActivoToggle
                  id={empresa.id}
                  activo={empresa.activo}
                  endpoint="/api/empresas"
                  nombre={`la empresa ${empresa.nombre}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        basePath="/empresas"
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ q: query.q, activo: query.activo }}
      />
    </div>
  );
}
