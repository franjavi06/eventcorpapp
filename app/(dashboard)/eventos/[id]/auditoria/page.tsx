import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { firstValues } from "@/lib/params";
import { idParamSchema } from "@/lib/validations/common";
import { listAuditoriaEvento } from "@/modules/auditoria/services/auditoria.service";
import { getEvento } from "@/modules/eventos/services/evento.service";

function detalleJson(value: unknown): string {
  if (value == null) return "—";
  const s = JSON.stringify(value);
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

async function AuditoriaContent({
  params,
  searchParams,
}: {
  params: PageProps<"/eventos/[id]/auditoria">["params"];
  searchParams: PageProps<"/eventos/[id]/auditoria">["searchParams"];
}) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const eventoId = parsed.data.id;

  const evento = await getEvento(eventoId).catch(() => null);
  if (!evento) notFound();

  const sp = firstValues(await searchParams);
  const result = await listAuditoriaEvento(eventoId, sp);

  return (
    <div className="space-y-6">
      <Link
        href={`/eventos/${eventoId}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Volver al evento
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Auditoría — {evento.nombre}
        </h1>
        <Badge>{evento.estado}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de operaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(a.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.accion}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{a.entidad}</TableCell>
                  <TableCell>{a.actor ?? "—"}</TableCell>
                  <TableCell className="max-w-md">
                    <span className="block truncate text-xs text-muted-foreground">
                      {detalleJson(a.despues ?? a.antes)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {result.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Sin operaciones registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            basePath={`/eventos/${eventoId}/auditoria`}
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            params={{ entidad: sp.entidad, accion: sp.accion }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function EventoAuditoriaPage({
  params,
  searchParams,
}: PageProps<"/eventos/[id]/auditoria">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AuditoriaContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
