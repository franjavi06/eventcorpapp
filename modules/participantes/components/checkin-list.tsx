import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { PoncharButton } from "@/modules/participantes/components/ponchar-button";
import type { ParticipanteListQuery } from "@/modules/participantes/schemas/participante.schema";
import { listParticipantes } from "@/modules/participantes/services/participante.service";

export async function CheckInList({
  eventoId,
  vista,
  query,
}: {
  eventoId: string;
  vista: "si" | "no";
  query: ParticipanteListQuery;
}) {
  const { data: participantes, total, page, pageSize } =
    await listParticipantes(
      eventoId,
      { ...query, asistencia: vista },
      vista === "si" ? [{ asistencia: { registradoAt: "desc" } }] : undefined,
    );

  if (participantes.length === 0) {
    return (
      <EmptyState
        title={vista === "si" ? "Aún no hay ponchados" : "Todos poncharon"}
        description={
          vista === "si"
            ? "Los empleados que registren asistencia aparecerán aquí."
            : "No quedan participantes pendientes de registrar asistencia."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {vista === "si" && <TableHead>Hora</TableHead>}
            <TableHead>Código</TableHead>
            <TableHead>Empleado</TableHead>
            <TableHead>Empresa</TableHead>
            {vista === "no" && (
              <TableHead className="text-right">Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {participantes.map((p) => (
            <TableRow key={p.id}>
              {vista === "si" && (
                <TableCell className="text-sm">
                  {p.asistencia
                    ? formatDateTime(p.asistencia.registradoAt)
                    : "—"}
                </TableCell>
              )}
              <TableCell className="font-mono text-sm">
                {p.empleado.codigo}
              </TableCell>
              <TableCell className="font-medium">
                {p.empleado.apellidos}, {p.empleado.nombres}
              </TableCell>
              <TableCell className="text-sm">
                {p.empleado.empresa.nombre}
              </TableCell>
              {vista === "no" && (
                <TableCell className="text-right">
                  <PoncharButton
                    eventoId={eventoId}
                    empleadoId={p.empleado.id}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        basePath={`/eventos/${eventoId}/check-in`}
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ q: query.q, asistencia: vista }}
      />
    </div>
  );
}
