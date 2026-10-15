import Link from "next/link";

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
import type { SorteoListQuery } from "@/modules/sorteos/schemas/sorteo.schema";
import { listSorteos } from "@/modules/sorteos/services/sorteo.service";

const ESTADO_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  BORRADOR: "outline",
  ACTIVO: "default",
  FINALIZADO: "secondary",
  CANCELADO: "destructive",
};

export async function SorteosTable({
  eventoId,
  query,
}: {
  eventoId: string;
  query: SorteoListQuery;
}) {
  const { data: sorteos, total, page, pageSize } = await listSorteos(
    eventoId,
    query,
  );

  if (sorteos.length === 0) {
    return (
      <EmptyState
        title="Sin sorteos"
        description="Crea el primer sorteo para este evento."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Ganadores</TableHead>
            <TableHead>Asistencia</TableHead>
            <TableHead>Reglas</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorteos.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-sm">{s.orden}</TableCell>
              <TableCell className="font-medium">{s.nombre}</TableCell>
              <TableCell>{s.cantidadGanadores}</TableCell>
              <TableCell>
                {s.asistenciaObligatoria ? (
                  <Badge variant="secondary">Obligatoria</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Opcional
                  </span>
                )}
              </TableCell>
              <TableCell>{s._count.reglas}</TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[s.estado] ?? "outline"}>
                  {s.estado}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/eventos/${eventoId}/sorteos/${s.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Editar
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        basePath={`/eventos/${eventoId}/sorteos`}
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ q: query.q, estado: query.estado }}
      />
    </div>
  );
}
