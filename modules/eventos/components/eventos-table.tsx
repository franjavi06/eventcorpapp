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
import { formatDateTime } from "@/lib/format";
import type { EventoListQuery } from "@/modules/eventos/schemas/evento.schema";
import { listEventos } from "@/modules/eventos/services/evento.service";

const ESTADO_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  BORRADOR: "outline",
  ACTIVO: "default",
  FINALIZADO: "secondary",
  CANCELADO: "destructive",
};

export async function EventosTable({ query }: { query: EventoListQuery }) {
  const { data: eventos, total, page, pageSize } = await listEventos(query);

  if (eventos.length === 0) {
    return (
      <EmptyState
        title="No hay eventos"
        description="Crea el primer evento o ajusta los filtros."
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
            <TableHead>Fechas</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Empresas</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((evento) => (
            <TableRow key={evento.id}>
              <TableCell className="font-mono text-sm">{evento.codigo}</TableCell>
              <TableCell className="font-medium">{evento.nombre}</TableCell>
              <TableCell className="text-sm">
                {formatDateTime(evento.fechaInicio)}
                <br />
                <span className="text-muted-foreground">
                  {formatDateTime(evento.fechaFin)}
                </span>
              </TableCell>
              <TableCell>{evento.ubicacion ?? "—"}</TableCell>
              <TableCell>{evento._count.empresas}</TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[evento.estado] ?? "outline"}>
                  {evento.estado}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/eventos/${evento.id}`}
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
        basePath="/eventos"
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ q: query.q, estado: query.estado }}
      />
    </div>
  );
}
