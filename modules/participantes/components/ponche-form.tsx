"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Briefcase,
  Maximize2,
  Minimize2,
  ScanBarcode,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EmpleadoAvatar } from "@/components/shared/empleado-avatar";
import { EmpresaLogo } from "@/components/shared/empresa-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

export type EmpresaCheckinOption = {
  id: string;
  codigo: string;
  nombre: string;
};

type UltimoPonche = {
  codigo: string;
  nombre: string;
  puesto?: string | null;
  departamento?: string | null;
  empresa: string;
  empresaCodigo?: string;
  registradoAt: string;
};

type CandidatoAmbiguo = {
  id: string;
  codigo: string;
  nombre: string;
  puesto?: string | null;
  departamento?: string | null;
  empresa: string;
  empresaCodigo?: string;
  yaPoncho?: boolean;
};

type PoncheFormProps = {
  eventoId: string;
  eventoNombre?: string;
  empresas?: EmpresaCheckinOption[];
};

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-64";

function formatCargo(item: {
  puesto?: string | null;
  departamento?: string | null;
}) {
  const parts = [item.puesto, item.departamento].filter(
    (v): v is string => !!v && v.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function PoncheForm({
  eventoId,
  eventoNombre,
  empresas = [],
}: PoncheFormProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [ultimo, setUltimo] = useState<UltimoPonche | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoAmbiguo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
      inputRef.current?.focus();
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else if (panelRef.current?.requestFullscreen) {
        await panelRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    } finally {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function ejecutarPonche(payload: {
    codigo?: string;
    empleadoId?: string;
    empresaId?: string;
  }) {
    startTransition(async () => {
      const res = await fetch(`/api/eventos/${eventoId}/asistencias`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const lista: CandidatoAmbiguo[] | undefined =
          body.error?.details?.candidatos;
        const mensaje = body.error?.message ?? "No se pudo registrar";
        if (Array.isArray(lista) && lista.length > 0) {
          setCandidatos(lista);
          setError(null);
          setUltimo(null);
          toast.warning(mensaje);
        } else {
          setCandidatos(null);
          setError(mensaje);
          setUltimo(null);
          toast.error(mensaje);
        }
      } else {
        const data = body.data;
        setCandidatos(null);
        setError(null);
        setUltimo({
          codigo: data.empleado?.codigo ?? payload.codigo ?? "",
          nombre: data.empleado?.nombre ?? payload.codigo ?? "",
          puesto: data.empleado?.puesto,
          departamento: data.empleado?.departamento,
          empresa: data.empleado?.empresa ?? "",
          empresaCodigo: data.empleado?.empresaCodigo,
          registradoAt: data.asistencia?.registradoAt,
        });
        toast.success(`Asistencia registrada — ${data.empleado?.nombre}`);
      }
      router.refresh();
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
      }
    });
  }

  function poncharPorCodigo(codigo: string) {
    ejecutarPonche({
      codigo,
      ...(empresaId ? { empresaId } : {}),
    });
  }

  function poncharCandidato(empleadoId: string) {
    ejecutarPonche({ empleadoId });
  }

  const cargoUltimo = ultimo ? formatCargo(ultimo) : null;

  return (
    <div
      ref={panelRef}
      className={`space-y-4 bg-card ${
        isFullscreen
          ? "fixed inset-0 z-50 flex min-h-screen flex-col justify-center overflow-y-auto p-10"
          : "rounded-3xl border p-6"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            Consola de Check-in
          </span>
          <h2 className="mt-0.5 text-lg font-bold text-foreground md:text-xl">
            {eventoNombre ? `Registrar asistencia — ${eventoNombre}` : "Registrar asistencia"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Escanea el carnet del empleado o escribe su código y pulsa Enter. Si
            aún no es participante, se incorpora automáticamente.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          title={
            isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
          }
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="size-4" />
              Salir
            </>
          ) : (
            <>
              <Maximize2 className="size-4" />
              Pantalla completa
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {empresas.length > 1 && (
          <select
            value={empresaId}
            onChange={(e) => {
              setEmpresaId(e.target.value);
              inputRef.current?.focus();
            }}
            aria-label="Empresa para el lector"
            className={selectClass}
          >
            <option value="">Todas las empresas habilitadas</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.codigo} — {emp.nombre}
              </option>
            ))}
          </select>
        )}
        <div className="relative flex-1">
          <ScanBarcode className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Escanea el carnet o escribe el código del empleado…"
            className="h-12 pl-10 text-lg"
            autoFocus
            autoComplete="off"
            disabled={pending}
            aria-label="Código de empleado"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const codigo = e.currentTarget.value.trim();
              if (codigo) poncharPorCodigo(codigo);
            }}
          />
        </div>
      </div>

      {candidatos && candidatos.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Users className="size-4 shrink-0" />
              Código repetido en varias empresas — seleccione al empleado:
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCandidatos(null);
                inputRef.current?.focus();
              }}
            >
              Cancelar
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {candidatos.map((c) => {
              const cargo = formatCargo(c);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <EmpleadoAvatar
                      empresaCodigo={c.empresaCodigo}
                      empleadoCodigo={c.codigo}
                      nombre={c.nombre}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {c.nombre}
                      </p>
                      {cargo && (
                        <p className="truncate text-xs font-medium text-indigo-500">
                          {cargo}
                        </p>
                      )}
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <EmpresaLogo
                          empresaCodigo={c.empresaCodigo}
                          nombre={c.empresa}
                          size="xs"
                        />
                        <span className="truncate font-semibold text-foreground">
                          {c.empresa}
                        </span>
                        <span>·</span>
                        <span className="font-mono">{c.codigo}</span>
                      </p>
                    </div>
                  </div>
                  {c.yaPoncho ? (
                    <Badge variant="secondary">Ya ponchó</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => poncharCandidato(c.id)}
                    >
                      Ponchar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ultimo && (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4">
          <EmpleadoAvatar
            empresaCodigo={ultimo.empresaCodigo}
            empleadoCodigo={ultimo.codigo}
            nombre={ultimo.nombre}
            size="lg"
            className="border-emerald-500/40"
          />
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {ultimo.nombre}
            </p>
            {cargoUltimo && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-indigo-500">
                <Briefcase className="size-3.5 shrink-0" />
                <span>{cargoUltimo}</span>
              </p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono">{ultimo.codigo}</span>
              {ultimo.empresa ? (
                <>
                  <span>·</span>
                  <EmpresaLogo
                    empresaCodigo={ultimo.empresaCodigo}
                    nombre={ultimo.empresa}
                    size="xs"
                  />
                  <span>{ultimo.empresa}</span>
                </>
              ) : null}
              <span>·</span>
              <span>{formatDateTime(ultimo.registradoAt)}</span>
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
