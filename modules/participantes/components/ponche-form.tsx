"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ScanBarcode } from "lucide-react";
import { toast } from "sonner";

import { EmpleadoAvatar } from "@/components/shared/empleado-avatar";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

type UltimoPonche = {
  codigo: string;
  nombre: string;
  empresa: string;
  empresaCodigo?: string;
  registradoAt: string;
};

export function PoncheForm({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [ultimo, setUltimo] = useState<UltimoPonche | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ponchar(codigo: string) {
    startTransition(async () => {
      const res = await fetch(`/api/eventos/${eventoId}/asistencias`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mensaje = body.error?.message ?? "No se pudo registrar";
        setError(mensaje);
        setUltimo(null);
        toast.error(mensaje);
      } else {
        const data = body.data;
        setError(null);
        setUltimo({
          codigo: data.empleado?.codigo ?? codigo,
          nombre: data.empleado?.nombre ?? codigo,
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <ScanBarcode className="absolute left-3 top-3 size-5 text-muted-foreground" />
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
            if (codigo) ponchar(codigo);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Escanea el código de barras del carnet o escribe el código y pulsa
        Enter.
      </p>

      {ultimo && (
        <div className="flex items-center gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <EmpleadoAvatar
            empresaCodigo={ultimo.empresaCodigo}
            empleadoCodigo={ultimo.codigo}
            nombre={ultimo.nombre}
            size="lg"
            className="border-emerald-500/40"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-emerald-600 dark:text-emerald-400">
              {ultimo.nombre}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{ultimo.codigo}</span>
              {ultimo.empresa ? ` · ${ultimo.empresa}` : ""} ·{" "}
              {formatDateTime(ultimo.registradoAt)}
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
