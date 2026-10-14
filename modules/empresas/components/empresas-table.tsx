import Link from "next/link";

import { ActivoToggle } from "@/components/shared/activo-toggle";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Clasificación</TableHead>
          <TableHead>Ubicación</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {empresas.map((empresa) => (
          <TableRow key={empresa.id}>
            <TableCell className="font-mono text-sm">{empresa.codigo}</TableCell>
            <TableCell className="font-medium">{empresa.nombre}</TableCell>
            <TableCell>{empresa.clasificacion ?? "—"}</TableCell>
            <TableCell>{empresa.ubicacion ?? "—"}</TableCell>
            <TableCell>
              {empresa.activo ? (
                <Badge>Activa</Badge>
              ) : (
                <Badge variant="secondary">Inactiva</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Link
                  href={`/empresas/${empresa.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Editar
                </Link>
                <ActivoToggle
                  id={empresa.id}
                  activo={empresa.activo}
                  endpoint="/api/empresas"
                  nombre={`la empresa ${empresa.nombre}`}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
