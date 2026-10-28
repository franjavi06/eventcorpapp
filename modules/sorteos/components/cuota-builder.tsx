"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PieChart, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import type { ReglaEntidad } from "@/generated/prisma/enums";
import { getCampoDef } from "@/modules/sorteos/lib/reglas-catalogo";
import type { ValoresSugeridosEvento } from "@/modules/sorteos/services/sorteo.service";

export type CuotaRow = {
  id: string;
  entidad: ReglaEntidad;
  campo: string;
  valor: string;
  cantidad: number;
  orden: number;
  activo: boolean;
};

const selectCls =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const CAMPOS_CUOTA: {
  key: string;
  entidad: ReglaEntidad;
  campo: string;
  label: string;
}[] = [
  {
    key: "EMPLEADO:departamento",
    entidad: "EMPLEADO",
    campo: "departamento",
    label: "Departamento del empleado",
  },
  {
    key: "EMPLEADO:clasificacion",
    entidad: "EMPLEADO",
    campo: "clasificacion",
    label: "Clasificación del empleado",
  },
  {
    key: "EMPLEADO:zona",
    entidad: "EMPLEADO",
    campo: "zona",
    label: "Zona del empleado",
  },
  {
    key: "EMPLEADO:puesto",
    entidad: "EMPLEADO",
    campo: "puesto",
    label: "Puesto del empleado",
  },
  {
    key: "EMPRESA:codigo",
    entidad: "EMPRESA",
    campo: "codigo",
    label: "Empresa (código)",
  },
];

export function CuotaBuilder({
  eventoId,
  sorteoId,
  cuotas,
  sugerencias,
}: {
  eventoId: string;
  sorteoId: string;
  cuotas: CuotaRow[];
  sugerencias?: ValoresSugeridosEvento;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [campoKey, setCampoKey] = useState("EMPLEADO:departamento");
  const [valor, setValor] = useState("");
  const [cantidad, setCantidad] = useState("1");

  const seleccion =
    CAMPOS_CUOTA.find((c) => c.key === campoKey) ?? CAMPOS_CUOTA[0]!;

  function getOpcionesParaSeleccion(): string[] {
    if (!sugerencias) return [];
    if (seleccion.entidad === "EMPLEADO") {
      if (seleccion.campo === "departamento") return sugerencias.departamentos;
      if (seleccion.campo === "clasificacion")
        return sugerencias.clasificaciones;
      if (seleccion.campo === "zona") return sugerencias.zonas;
      if (seleccion.campo === "puesto") return sugerencias.puestos;
    }
    if (seleccion.entidad === "EMPRESA" && seleccion.campo === "codigo") {
      return sugerencias.empresasCodigos;
    }
    return [];
  }

  const opciones = getOpcionesParaSeleccion();
  const totalCuotasActivas = cuotas
    .filter((c) => c.activo)
    .reduce((acc, c) => acc + c.cantidad, 0);

  function agregar() {
    const cantNum = Number(cantidad);
    if (!valor.trim() || !Number.isInteger(cantNum) || cantNum < 1) return;

    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/cuotas`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entidad: seleccion.entidad,
            campo: seleccion.campo,
            valor: valor.trim(),
            cantidad: cantNum,
            orden: cuotas.length,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo añadir la cuota");
        return;
      }
      toast.success("Cuota añadida y cantidad de ganadores actualizada");
      setValor("");
      setCantidad("1");
      router.refresh();
    });
  }

  function toggleActiva(cuota: CuotaRow) {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/cuotas/${cuota.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...cuota, activo: !cuota.activo }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo actualizar la cuota");
        return;
      }
      router.refresh();
    });
  }

  function eliminar(cuotaId: string) {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/cuotas/${cuotaId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error?.message ?? "No se pudo eliminar la cuota");
        return;
      }
      toast.success("Cuota eliminada");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="size-4 text-indigo-500" />
              Distribución de cupos por área / grupo (Cuotas)
            </CardTitle>
            <CardDescription>
              Opcional: reparte los premios de este sorteo entre distintos
              departamentos, clasificaciones, zonas o empresas (por ejemplo: 4
              Administración + 10 Operaciones + 6 Comercial = 20 ganadores).
            </CardDescription>
          </div>
          {totalCuotasActivas > 0 && (
            <Badge className="bg-indigo-500/15 text-indigo-500">
              Total por cuotas: {totalCuotasActivas} ganador
              {totalCuotasActivas === 1 ? "" : "es"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={selectCls}
            value={campoKey}
            onChange={(e) => {
              setCampoKey(e.target.value);
              setValor("");
            }}
            aria-label="Agrupar por"
          >
            {CAMPOS_CUOTA.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          {opciones.length > 0 && (
            <select
              className={selectCls}
              value={opciones.includes(valor) ? valor : ""}
              onChange={(e) => {
                if (e.target.value) setValor(e.target.value);
              }}
              aria-label="Elegir grupo existente"
            >
              <option value="">Elegir de la lista…</option>
              {opciones.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={
              opciones.length > 0
                ? "O escriba el grupo…"
                : "Valor (ej. ADMINISTRACION)…"
            }
            className="w-52"
            aria-label="Valor de la cuota"
          />

          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={500}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-20"
              aria-label="Cantidad de ganadores"
            />
            <span className="text-xs text-muted-foreground">ganadores</span>
          </div>

          <Button
            type="button"
            size="sm"
            disabled={pending || !valor.trim() || Number(cantidad) < 1}
            onClick={agregar}
          >
            <Plus className="size-4" />
            Añadir cuota
          </Button>
        </div>

        {cuotas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin cuotas: todos los ganadores se eligen libremente del universo
            que cumpla las reglas de elegibilidad.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {cuotas.map((c) => {
              const def = getCampoDef(c.entidad, c.campo);
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline">
                      {c.entidad === "EMPRESA" ? "Empresa" : "Empleado"}
                    </Badge>
                    <span className="text-muted-foreground">
                      {def?.label ?? c.campo}:
                    </span>
                    <span className="font-semibold">{c.valor}</span>
                    <Badge className="bg-amber-500/15 text-amber-500">
                      {c.cantidad} ganador{c.cantidad === 1 ? "" : "es"}
                    </Badge>
                    {!c.activo && (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </span>
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => toggleActiva(c)}
                    >
                      {c.activo ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => eliminar(c.id)}
                      aria-label="Eliminar cuota"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
