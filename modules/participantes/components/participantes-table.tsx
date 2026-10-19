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
import { ParticipanteActions } from "@/modules/participantes/components/participante-actions";
import type { ParticipanteListQuery } from "@/modules/participantes/schemas/participante.schema";
import { listParticipantes } from "@/modules/participantes/services/participante.service";

export async function ParticipantesTable({
  eventoId,
  query,
}: {
  eventoId: string;
  query: ParticipanteListQuery;
}) {
  const { data: participantes, total, page, pageSize } =
    await listParticipantes(eventoId, query);

  if (participantes.length === 0) {
    return (
      <EmptyState
        title="Sin participantes"
        description="Añade empleados de las empresas habilitadas o registra su asistencia en el check-in."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Empleado</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Asistencia</TableHead>
            <TableHead>Sorteos</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participantes.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-sm">
                {p.empleado.codigo}
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {p.empleado.apellidos}, {p.empleado.nombres}
                </div>
                <div className="text-sm text-muted-foreground">
                  {p.empleado.correo ?? "—"}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {p.empleado.empresa.nombre}
              </TableCell>
              <TableCell>
                {p.asistencia ? (
                  <Badge>
                    {formatDateTime(p.asistencia.registradoAt)}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {p.participaSorteos ? (
                  <Badge variant="secondary">Elegible</Badge>
                ) : (
                  <div>
                    <Badge variant="destructive">Excluido</Badge>
                    <p
                      className="mt-1 max-w-48 truncate text-xs text-muted-foreground"
                      title={p.exclusionMotivo ?? undefined}
                    >
                      {p.exclusionMotivo}
                    </p>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <ParticipanteActions
                  eventoId={eventoId}
                  empleadoId={p.empleado.id}
                  nombre={`${p.empleado.nombres} ${p.empleado.apellidos}`}
                  tieneAsistencia={!!p.asistencia}
                  participaSorteos={p.participaSorteos}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        basePath={`/eventos/${eventoId}/participantes`}
        page={page}
        pageSize={pageSize}
        total={total}
        params={{
          q: query.q,
          empresaId: query.empresaId,
          asistencia: query.asistencia,
          sorteos: query.sorteos,
        }}
      />
    </div>
  );
}
