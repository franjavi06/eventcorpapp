"use client";

import { useState, useTransition } from "react";
import { Dices, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { EmpleadoAvatar } from "@/components/shared/empleado-avatar";
import { EmpresaLogo } from "@/components/shared/empresa-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Elegible = {
  id: string;
  empleado: {
    codigo: string;
    nombres: string;
    apellidos: string;
    puesto?: string | null;
    departamento: string | null;
    clasificacion: string | null;
    zona: string | null;
    fechaIngreso: string | Date | null;
    empresa: { codigo: string; nombre: string };
  };
  asistencia: { registradoAt: string } | null;
};

type CuotaResumen = {
  id: string;
  entidad: string;
  campo: string;
  valor: string;
  requeridos: number;
  disponibles: number;
};

type SimulacionResult = {
  totalElegibles: number;
  cantidadGanadores: number;
  reglasAplicadas: number;
  cuotasAplicadas?: number;
  ganadoresSimulados: (Elegible & { orden: number })[];
};

function formatAntiguedad(fechaIngreso: string | Date | null): string {
  if (!fechaIngreso) return "—";
  const start = new Date(fechaIngreso);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let meses =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) meses -= 1;
  if (meses < 0) meses = 0;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anos > 0) {
    return resto > 0
      ? `${anos} año${anos === 1 ? "" : "s"}, ${resto} m`
      : `${anos} año${anos === 1 ? "" : "s"}`;
  }
  return `${meses} mes${meses === 1 ? "" : "es"}`;
}

export function ElegiblesPreview({
  eventoId,
  sorteoId,
}: {
  eventoId: string;
  sorteoId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [simPending, startSimTransition] = useTransition();
  const [result, setResult] = useState<{
    total: number;
    data: Elegible[];
    reglasAplicadas: number;
    cuotasResumen?: CuotaResumen[];
  } | null>(null);
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simulacion, setSimulacion] = useState<SimulacionResult | null>(null);

  function cargar() {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/elegibles`,
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(
          body.error?.message ?? "No se pudo calcular la elegibilidad",
        );
        return;
      }
      setResult(body.data);
    });
  }

  function ejecutarSimulacion() {
    startSimTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/elegibles`,
        { method: "POST" },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo simular el sorteo");
        return;
      }
      setSimulacion(body.data);
      setSimModalOpen(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Candidatos elegibles</CardTitle>
        <CardDescription>
          Vista previa de quiénes podrían ganar con la configuración actual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cargar}
            disabled={pending || simPending}
          >
            {pending ? "Calculando…" : "Calcular elegibles"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={ejecutarSimulacion}
            disabled={pending || simPending}
          >
            <Dices className="size-4 text-indigo-500" />
            {simPending ? "Simulando…" : "Simular sorteo"}
          </Button>
          {result && (
            <p className="text-sm text-muted-foreground">
              {result.total} elegible{result.total === 1 ? "" : "s"} ·{" "}
              {result.reglasAplicadas} regla
              {result.reglasAplicadas === 1 ? "" : "s"} aplicada
              {result.reglasAplicadas === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {result?.cuotasResumen && result.cuotasResumen.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-muted-foreground">
              Disponibilidad por cuota:
            </span>
            {result.cuotasResumen.map((c) => {
              const ok = c.disponibles >= c.requeridos;
              return (
                <Badge
                  key={c.id}
                  variant={ok ? "outline" : "destructive"}
                  className="gap-1.5"
                >
                  <span>{c.valor}:</span>
                  <span className="font-mono font-bold">
                    {c.disponibles} disp. / {c.requeridos} req.
                  </span>
                </Badge>
              );
            })}
          </div>
        )}

        {result && result.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Antigüedad</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Clasificación</TableHead>
                <TableHead>Asistencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">
                    {p.empleado.codigo}
                  </TableCell>
                  <TableCell>
                    {p.empleado.apellidos}, {p.empleado.nombres}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.empleado.empresa.nombre}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.empleado.departamento ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatAntiguedad(p.empleado.fechaIngreso)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.empleado.zona ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.empleado.clasificacion ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.asistencia ? (
                      <Badge>Sí</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {result && result.total > result.data.length && (
          <p className="text-xs text-muted-foreground">
            Mostrando {result.data.length} de {result.total}.
          </p>
        )}

        <Dialog open={simModalOpen} onOpenChange={setSimModalOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-indigo-500" />
                Simulación de sorteo (Modo prueba)
              </DialogTitle>
              <DialogDescription>
                {simulacion
                  ? `Se seleccionaron al azar ${simulacion.cantidadGanadores} ganador(es) de ${simulacion.totalElegibles} candidato(s) elegible(s) (${simulacion.reglasAplicadas} regla(s) aplicada(s)).`
                  : "Resultado de prueba."}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-600 dark:text-amber-400">
              <strong>Ensayo sin efecto en la base de datos:</strong> estos
              ganadores son únicamente una muestra de prueba y{" "}
              <strong>no quedan registrados ni excluidos</strong> del sorteo
              oficial.
            </div>

            {simulacion && (
              <div className="max-h-96 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Antigüedad</TableHead>
                      <TableHead>Zona</TableHead>
                      <TableHead>Clasificación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulacion.ganadoresSimulados.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono font-bold text-indigo-500">
                          #{g.orden}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <EmpleadoAvatar
                              empresaCodigo={g.empleado.empresa.codigo}
                              empleadoCodigo={g.empleado.codigo}
                              nombre={`${g.empleado.nombres} ${g.empleado.apellidos}`}
                              size="md"
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {g.empleado.apellidos}, {g.empleado.nombres}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {g.empleado.codigo}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <EmpresaLogo
                              empresaCodigo={g.empleado.empresa.codigo}
                              nombre={g.empleado.empresa.nombre}
                              size="xs"
                            />
                            <span>{g.empleado.empresa.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {g.empleado.departamento ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatAntiguedad(g.empleado.fechaIngreso)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {g.empleado.zona ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {g.empleado.clasificacion ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={ejecutarSimulacion}
                disabled={simPending}
              >
                <RefreshCw
                  className={`size-4 ${simPending ? "animate-spin" : ""}`}
                />
                Volver a simular
              </Button>
              <Button type="button" onClick={() => setSimModalOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
