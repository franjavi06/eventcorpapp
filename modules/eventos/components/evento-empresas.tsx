"use client";

import { useRouter } from "next/navigation";
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

type EmpresaOption = { id: string; codigo: string; nombre: string };
type EmpresaAsociada = EmpresaOption & { activo: boolean };

type EventoEmpresasProps = {
  eventoId: string;
  asociadas: EmpresaAsociada[];
  disponibles: EmpresaOption[];
};

export function EventoEmpresas({
  eventoId,
  asociadas,
  disponibles,
}: EventoEmpresasProps) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState("");
  const [pending, startTransition] = useTransition();

  function asociar() {
    if (!seleccion) return;
    startTransition(async () => {
      const res = await fetch(`/api/eventos/${eventoId}/empresas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ empresaId: seleccion }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo asociar la empresa");
        return;
      }
      const inscritos: number = body.data?.empleadosInscritos ?? 0;
      toast.success(
        inscritos > 0
          ? `Empresa asociada — ${inscritos} empleados inscritos como participantes`
          : "Empresa asociada al evento",
      );
      setSeleccion("");
      router.refresh();
    });
  }

  function quitar(empresaId: string) {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/empresas/${empresaId}`,
        { method: "DELETE" },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo quitar la empresa");
        return;
      }
      toast.success("Empresa removida del evento");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Empresas habilitadas</CardTitle>
        <CardDescription>
          Solo empleados de estas empresas podrán participar en el evento. Al
          asociar una empresa, todos sus empleados activos se inscriben
          automáticamente como participantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <select
            value={seleccion}
            onChange={(e) => setSeleccion(e.target.value)}
            className="h-8 w-full max-w-md rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Empresa a asociar"
          >
            <option value="">
              {disponibles.length
                ? "Selecciona una empresa activa…"
                : "No hay empresas activas disponibles"}
            </option>
            {disponibles.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} — {e.nombre}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={asociar}
            disabled={!seleccion || pending}
          >
            Asociar
          </Button>
        </div>

        {asociadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguna empresa asociada todavía.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {asociadas.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="text-sm">
                  <span className="font-mono">{e.codigo}</span> — {e.nombre}
                  {!e.activo && (
                    <Badge variant="secondary" className="ml-2">
                      Inactiva
                    </Badge>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => quitar(e.id)}
                  disabled={pending}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
