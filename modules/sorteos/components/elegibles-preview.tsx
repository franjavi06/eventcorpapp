"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
    empresa: { codigo: string; nombre: string };
  };
  asistencia: { registradoAt: string } | null;
};

export function ElegiblesPreview({
  eventoId,
  sorteoId,
}: {
  eventoId: string;
  sorteoId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    total: number;
    data: Elegible[];
    reglasAplicadas: number;
  } | null>(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Candidatos elegibles</CardTitle>
        <CardDescription>
          Vista previa de quiénes podrían ganar con la configuración actual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cargar}
            disabled={pending}
          >
            {pending ? "Calculando…" : "Calcular elegibles"}
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

        {result && result.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Empresa</TableHead>
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
      </CardContent>
    </Card>
  );
}
