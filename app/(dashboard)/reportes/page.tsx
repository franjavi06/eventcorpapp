import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Download, FileText } from "lucide-react";

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
import { getReporteGlobal } from "@/modules/reportes/services/reporte.service";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

async function ReportesContent() {
  await connection();
  const r = await getReporteGlobal();
  const estados = r.totales.eventosPorEstado as Record<string, number>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Empresas" value={r.totales.empresas} />
        <StatCard
          label="Empleados activos"
          value={`${r.totales.empleadosActivos}/${r.totales.empleados}`}
        />
        <StatCard label="Sorteos finalizados" value={r.totales.sorteosFinalizados} />
        <StatCard label="Ganadores" value={r.totales.ganadores} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos por estado</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          {(["BORRADOR", "ACTIVO", "FINALIZADO", "CANCELADO"] as const).map(
            (estado) => (
              <Badge key={estado} variant="outline" className="text-sm">
                {estado}: {estados[estado] ?? 0}
              </Badge>
            ),
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead className="text-right">Empresas</TableHead>
                <TableHead className="text-right">Participantes</TableHead>
                <TableHead className="text-right">Asistencias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.eventos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/eventos/${e.id}/reporte`}
                      className="underline-offset-4 hover:underline"
                    >
                      {e.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.estado}</Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(e.fechaInicio)}</TableCell>
                  <TableCell className="text-right">{e.empresas}</TableCell>
                  <TableCell className="text-right">
                    {e.participantes}
                  </TableCell>
                  <TableCell className="text-right">{e.asistencias}</TableCell>
                </TableRow>
              ))}
              {r.eventos.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Aún no hay eventos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Resumen global de eventos, asistencia y sorteos.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/reportes/pdf"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileText className="size-4" />
            Exportar PDF (.pdf)
          </a>
          <a
            href="/api/reportes/excel"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-4" />
            Exportar Excel (.xlsx)
          </a>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ReportesContent />
      </Suspense>
    </div>
  );
}
