"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
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
  type CampoTipo,
  getCampoDef,
  getOperadorLabel,
  OPERADORES_POR_TIPO,
  REGLAS_CATALOGO,
} from "@/modules/sorteos/lib/reglas-catalogo";
import type { ValoresSugeridosEvento } from "@/modules/sorteos/services/sorteo.service";

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

const MESES_PRESETS = [
  { label: "3 meses", value: "3" },
  { label: "6 meses", value: "6" },
  { label: "12 meses (1 año)", value: "12" },
  { label: "24 meses (2 años)", value: "24" },
];

function ValorInput({
  tipo,
  valor,
  opcionesSugeridas,
  onChange,
}: {
  tipo: CampoTipo;
  valor: string;
  opcionesSugeridas: string[];
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
  if (tipo === "meses") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={600}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            placeholder="6"
            className="w-24"
            aria-label="Valor"
          />
          <span className="text-xs text-muted-foreground">meses</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {MESES_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                valor === p.value
                  ? "border-indigo-500 bg-indigo-500/15 text-indigo-500"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {opcionesSugeridas.length > 0 && (
        <select
          className={selectCls}
          value={opcionesSugeridas.includes(valor) ? valor : ""}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          aria-label="Valores existentes"
        >
          <option value="">Elegir de la lista…</option>
          {opcionesSugeridas.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      <Input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          opcionesSugeridas.length > 0 ? "O escriba valor…" : "Valor…"
        }
        aria-label="Valor"
      />
    </div>
  );
}

export function ReglaBuilder({
  eventoId,
  sorteoId,
  reglas,
  sugerencias,
}: {
  eventoId: string;
  sorteoId: string;
  reglas: ReglaRow[];
  sugerencias?: ValoresSugeridosEvento;
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

  function getOpcionesParaCampo(): string[] {
    if (!sugerencias) return [];
    if (entidad === "EMPLEADO") {
      if (campo === "departamento") return sugerencias.departamentos;
      if (campo === "clasificacion") return sugerencias.clasificaciones;
      if (campo === "zona") return sugerencias.zonas;
      if (campo === "puesto") return sugerencias.puestos;
    }
    if (entidad === "EMPRESA" && campo === "codigo") {
      return sugerencias.empresasCodigos;
    }
    return [];
  }

  function resetEntidad(e: ReglaEntidad) {
    setEntidad(e);
    setCampo("");
    setOperador("");
    setValor("");
  }

  function resetCampo(c: string) {
    setCampo(c);
    const def = c ? getCampoDef(entidad, c) : null;
    if (def?.tipo === "meses") {
      setOperador("DESPUES_DE");
      setValor("6");
    } else if (def?.tipo === "texto") {
      setOperador("IGUAL");
      setValor("");
    } else {
      setOperador("");
      setValor("");
    }
  }

  function guardarRegla(payload: {
    entidad: ReglaEntidad;
    campo: string;
    operador: ReglaOperador;
    valor: string;
  }) {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/reglas`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...payload,
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

  function agregar() {
    if (!campo || !operador || !valor.trim()) return;
    guardarRegla({
      entidad,
      campo,
      operador,
      valor: valor.trim(),
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

  const departamentosRapidos = sugerencias?.departamentos.slice(0, 6) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reglas de elegibilidad</CardTitle>
        <CardDescription>
          Condiciones combinadas con AND: el candidato debe cumplirlas todas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs">
          <span className="mr-1 flex items-center gap-1 font-semibold text-indigo-500">
            <Sparkles className="size-3.5" />
            Reglas rápidas (1 clic):
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={pending}
            onClick={() =>
              guardarRegla({
                entidad: "EMPLEADO",
                campo: "antiguedadMeses",
                operador: "DESPUES_DE",
                valor: "6",
              })
            }
          >
            + Antigüedad ≥ 6 meses
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={pending}
            onClick={() =>
              guardarRegla({
                entidad: "EMPLEADO",
                campo: "antiguedadMeses",
                operador: "DESPUES_DE",
                valor: "12",
              })
            }
          >
            + Antigüedad ≥ 12 meses
          </Button>
          {departamentosRapidos.map((depto) => (
            <Button
              key={depto}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={pending}
              onClick={() =>
                guardarRegla({
                  entidad: "EMPLEADO",
                  campo: "departamento",
                  operador: "IGUAL",
                  valor: depto,
                })
              }
            >
              + Depto: {depto}
            </Button>
          ))}
        </div>

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
                {getOperadorLabel(campoDef?.tipo, op)}
              </option>
            ))}
          </select>
          {campoDef && (
            <ValorInput
              tipo={campoDef.tipo}
              valor={valor}
              opcionesSugeridas={getOpcionesParaCampo()}
              onChange={setValor}
            />
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
                      {getOperadorLabel(def?.tipo, r.operador)}
                    </span>{" "}
                    <span className="font-medium">
                      {def?.tipo === "booleano"
                        ? r.valor === "true"
                          ? "Verdadero"
                          : "Falso"
                        : def?.tipo === "meses"
                          ? `${r.valor} meses`
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
