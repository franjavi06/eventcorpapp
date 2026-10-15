"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import type { ReglaEntidad, ReglaOperador } from "@/generated/prisma/enums";
import {
  getCampoDef,
  OPERADOR_LABELS,
  OPERADORES_POR_TIPO,
  REGLAS_CATALOGO,
} from "@/modules/sorteos/lib/reglas-catalogo";

export type ReglaRow = {
  id: string;
  entidad: ReglaEntidad;
  campo: string;
  operador: ReglaOperador;
  valor: string;
  orden: number;
  activo: boolean;
};

const selectCls =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function ValorInput({
  tipo,
  valor,
  onChange,
}: {
  tipo: "texto" | "booleano" | "fecha";
  valor: string;
  onChange: (v: string) => void;
}) {
  if (tipo === "booleano") {
    return (
      <select
        className={selectCls}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Valor"
      >
        <option value="">—</option>
        <option value="true">Verdadero</option>
        <option value="false">Falso</option>
      </select>
    );
  }
  if (tipo === "fecha") {
    return (
      <Input
        type="date"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Valor"
      />
    );
  }
  return (
    <Input
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Valor…"
      aria-label="Valor"
    />
  );
}

export function ReglaBuilder({
  eventoId,
  sorteoId,
  reglas,
}: {
  eventoId: string;
  sorteoId: string;
  reglas: ReglaRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [entidad, setEntidad] = useState<ReglaEntidad>("EMPLEADO");
  const [campo, setCampo] = useState("");
  const [operador, setOperador] = useState<ReglaOperador | "">("");
  const [valor, setValor] = useState("");

  const campos = Object.entries(REGLAS_CATALOGO[entidad]);
  const campoDef = campo ? getCampoDef(entidad, campo) : null;
  const operadores = campoDef ? OPERADORES_POR_TIPO[campoDef.tipo] : [];

  function resetEntidad(e: ReglaEntidad) {
    setEntidad(e);
    setCampo("");
    setOperador("");
    setValor("");
  }

  function resetCampo(c: string) {
    setCampo(c);
    setOperador("");
    setValor("");
  }

  function agregar() {
    if (!campo || !operador || !valor.trim()) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/reglas`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entidad,
            campo,
            operador,
            valor: valor.trim(),
            orden: reglas.length,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo añadir la regla");
        return;
      }
      toast.success("Regla añadida");
      setCampo("");
      setOperador("");
      setValor("");
      router.refresh();
    });
  }

  function toggleActiva(regla: ReglaRow) {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/reglas/${regla.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...regla, activo: !regla.activo }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo actualizar la regla");
        return;
      }
      router.refresh();
    });
  }

  function eliminar(reglaId: string) {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/reglas/${reglaId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error?.message ?? "No se pudo eliminar la regla");
        return;
      }
      toast.success("Regla eliminada");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reglas de elegibilidad</CardTitle>
        <CardDescription>
          Condiciones combinadas con AND: el candidato debe cumplirlas todas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={selectCls}
            value={entidad}
            onChange={(e) => resetEntidad(e.target.value as ReglaEntidad)}
            aria-label="Entidad"
          >
            <option value="EMPLEADO">Empleado</option>
            <option value="EMPRESA">Empresa</option>
          </select>
          <select
            className={selectCls}
            value={campo}
            onChange={(e) => resetCampo(e.target.value)}
            aria-label="Campo"
          >
            <option value="">Campo…</option>
            {campos.map(([key, def]) => (
              <option key={key} value={key}>
                {def.label}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={operador}
            onChange={(e) => setOperador(e.target.value as ReglaOperador)}
            disabled={!campo}
            aria-label="Operador"
          >
            <option value="">Operador…</option>
            {operadores.map((op) => (
              <option key={op} value={op}>
                {OPERADOR_LABELS[op]}
              </option>
            ))}
          </select>
          {campoDef && (
            <ValorInput tipo={campoDef.tipo} valor={valor} onChange={setValor} />
          )}
          <Button
            type="button"
            size="sm"
            disabled={pending || !campo || !operador || !valor.trim()}
            onClick={agregar}
          >
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>

        {reglas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin reglas: cualquier participante elegible podrá ganar.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {reglas.map((r) => {
              const def = getCampoDef(r.entidad, r.campo);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="text-sm">
                    <Badge variant="outline" className="mr-2">
                      {r.entidad === "EMPRESA" ? "Empresa" : "Empleado"}
                    </Badge>
                    {def?.label ?? r.campo}{" "}
                    <span className="text-muted-foreground">
                      {OPERADOR_LABELS[r.operador]}
                    </span>{" "}
                    <span className="font-medium">
                      {def?.tipo === "booleano"
                        ? r.valor === "true"
                          ? "Verdadero"
                          : "Falso"
                        : r.valor}
                    </span>
                    {!r.activo && (
                      <Badge variant="secondary" className="ml-2">
                        Inactiva
                      </Badge>
                    )}
                  </span>
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => toggleActiva(r)}
                    >
                      {r.activo ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => eliminar(r.id)}
                      aria-label="Eliminar regla"
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
