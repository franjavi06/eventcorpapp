import Link from "next/link";
import { notFound } from "next/navigation";
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
import { idParamSchema } from "@/lib/validations/common";
import { getReporteEvento } from "@/modules/reportes/services/reporte.service";

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

async function ReporteContent({
  params,
}: {
  params: PageProps<"/eventos/[id]/reporte">["params"];
}) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const r = await getReporteEvento(parsed.data.id).catch(() => null);
  if (!r) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/eventos/${parsed.data.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Volver al evento
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reporte — {r.evento.nombre}
          </h1>
          <Badge>{r.evento.estado}</Badge>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/eventos/${parsed.data.id}/reporte/pdf`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileText className="size-4" />
            Exportar PDF (.pdf)
          </a>
          <a
            href={`/api/eventos/${parsed.data.id}/reporte/excel`}
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="size-4" />
            Exportar Excel (.xlsx)
          </a>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {r.evento.codigo} · {formatDateTime(r.evento.fechaInicio)} —{" "}
        {formatDateTime(r.evento.fechaFin)}
        {r.evento.ubicacion ? ` · ${r.evento.ubicacion}` : ""}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Empresas" value={r.totales.empresas} />
        <StatCard label="Participantes" value={r.totales.participantes} />
        <StatCard label="Asistencias" value={r.totales.asistencias} />
        <StatCard label="Elegibles" value={r.totales.elegibles} />
        <StatCard label="Sorteos" value={r.totales.sorteos} />
        <StatCard label="Ganadores" value={r.totales.ganadores} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresas participantes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Participantes</TableHead>
                <TableHead className="text-right">Asistencias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.empresas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  <TableCell>{e.codigo}</TableCell>
                  <TableCell className="text-right">
                    {e.participantes}
                  </TableCell>
                  <TableCell className="text-right">{e.asistencias}</TableCell>
                </TableRow>
              ))}
              {r.empresas.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Sin empresas asociadas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sorteos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ganadores</TableHead>
                <TableHead className="text-right">Reglas</TableHead>
                <TableHead className="text-right">Ejecuciones</TableHead>
                <TableHead>Ejecutado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.sorteos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.cantidadGanadores}
                  </TableCell>
                  <TableCell className="text-right">{s.reglas}</TableCell>
                  <TableCell className="text-right">{s.ejecuciones}</TableCell>
                  <TableCell>
                    {s.ejecutadoAt ? formatDateTime(s.ejecutadoAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {r.sorteos.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Sin sorteos configurados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ganadores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Sorteo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.ganadores.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.empleado}</TableCell>
                  <TableCell>{g.codigoEmpleado}</TableCell>
                  <TableCell>{g.puesto ?? "—"}</TableCell>
                  <TableCell>{g.departamento ?? "—"}</TableCell>
                  <TableCell>{g.empresa}</TableCell>
                  <TableCell>{g.sorteo}</TableCell>
                </TableRow>
              ))}
              {r.ganadores.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Aún no hay ganadores.
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

export default function EventoReportePage({
  params,
}: PageProps<"/eventos/[id]/reporte">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ReporteContent params={params} />
    </Suspense>
  );
}
