"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Candidato = {
  id: string;
  codigo: string;
  identificacion: string | null;
  nombres: string;
  apellidos: string;
  correo: string | null;
  empresa: { id: string; codigo: string; nombre: string };
  participaciones: { id: string; asistencia: { id: string } | null }[];
};

type CandidatoSearchProps = {
  eventoId: string;
  /** "checkin" registra asistencia; "add" da de alta como participante */
  mode: "checkin" | "add";
};

export function CandidatoSearch({ eventoId, mode }: CandidatoSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Candidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const excluir = mode === "add" ? "&excluirParticipantes=1" : "";
        const res = await fetch(
          `/api/eventos/${eventoId}/candidatos?q=${encodeURIComponent(q)}${excluir}`,
          { signal: controller.signal },
        );
        const body = await res.json();
        if (res.ok) setResultados(body.data);
      } catch {
        /* abortado */
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, eventoId, mode]);

  function registrar(empleadoId: string) {
    const url =
      mode === "checkin"
        ? `/api/eventos/${eventoId}/asistencias`
        : `/api/eventos/${eventoId}/participantes`;
    const exito =
      mode === "checkin" ? "Asistencia registrada" : "Participante añadido";
    const fallo =
      mode === "checkin"
        ? "No se pudo registrar la asistencia"
        : "No se pudo añadir al participante";

    startTransition(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ empleadoId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error?.message ?? fallo);
        return;
      }
      toast.success(exito);
      // refresca resultados para reflejar el nuevo estado
      const excluir = mode === "add" ? "&excluirParticipantes=1" : "";
      const r = await fetch(
        `/api/eventos/${eventoId}/candidatos?q=${encodeURIComponent(q)}${excluir}`,
      );
      const b = await r.json();
      if (r.ok) setResultados(b.data);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Código, identificación, nombre o correo…"
          className="pl-8"
          aria-label="Buscar empleado"
          autoFocus
        />
      </div>

      {buscando && (
        <p className="text-sm text-muted-foreground">Buscando…</p>
      )}

      {!buscando && resultados.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {q
            ? mode === "add"
              ? "Sin resultados. Solo aparecen empleados activos de empresas habilitadas que aún no participan."
              : "Sin resultados. Solo aparecen empleados activos de empresas habilitadas."
            : "Escribe para buscar empleados de las empresas habilitadas."}
        </p>
      )}

      {resultados.length > 0 && (
        <ul className="divide-y rounded-md border">
          {resultados.map((e) => {
            const participacion = e.participaciones[0];
            const yaRegistrado = mode === "checkin" && !!participacion?.asistencia;
            const yaParticipa = mode === "add" && !!participacion;
            const disabled = pending || yaRegistrado || yaParticipa;

            return (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {e.apellidos}, {e.nombres}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{e.codigo}</span>
                    {e.identificacion ? ` · ${e.identificacion}` : ""} ·{" "}
                    {e.empresa.nombre}
                  </p>
                </div>
                {yaRegistrado ? (
                  <Badge>Asistencia registrada</Badge>
                ) : yaParticipa ? (
                  <Badge variant="secondary">Ya participa</Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled}
                    onClick={() => registrar(e.id)}
                  >
                    {mode === "checkin" ? "Registrar" : "Añadir"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
