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
import type { EmpleadoListQuery } from "@/modules/empleados/schemas/empleado.schema";
import { listEmpleados } from "@/modules/empleados/services/empleado.service";

export async function EmpleadosTable({ query }: { query: EmpleadoListQuery }) {
  const { data: empleados, total, page, pageSize } = await listEmpleados(query);

  if (empleados.length === 0) {
    return (
      <EmptyState
        title="No hay empleados"
        description="Crea el primer empleado o ajusta los filtros."
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
          <TableHead>Empresa</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Departamento</TableHead>
          <TableHead>Zona</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {empleados.map((empleado) => (
          <TableRow key={empleado.id}>
            <TableCell className="font-mono text-sm">{empleado.codigo}</TableCell>
            <TableCell className="font-medium">
              {empleado.apellidos}, {empleado.nombres}
            </TableCell>
            <TableCell>
              {empleado.empresa.codigo} — {empleado.empresa.nombre}
            </TableCell>
            <TableCell>{empleado.correo}</TableCell>
            <TableCell>{empleado.departamento ?? "—"}</TableCell>
            <TableCell>{empleado.zona ?? "—"}</TableCell>
            <TableCell>
              {empleado.activo ? (
                <Badge>Activo</Badge>
              ) : (
                <Badge variant="secondary">Inactivo</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Link
                  href={`/empleados/${empleado.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Editar
                </Link>
                <ActivoToggle
                  id={empleado.id}
                  activo={empleado.activo}
                  endpoint="/api/empleados"
                  nombre={`el empleado ${empleado.nombres} ${empleado.apellidos}`}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <Pagination
      basePath="/empleados"
      page={page}
      pageSize={pageSize}
      total={total}
      params={{ q: query.q, activo: query.activo, empresaId: query.empresaId }}
    />
    </div>
  );
}
