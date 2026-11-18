"use client";

import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

type AuditoriaDetalle = {
  id: string;
  entidad: string;
  entidadId: string | null;
  accion: string;
  actor: string | null;
  antes: unknown;
  despues: unknown;
  createdAt: Date;
};

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <pre className="max-h-56 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function AuditoriaDetalleDialog({
  registro,
}: {
  registro: AuditoriaDetalle;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Ver detalle" />
        }
      >
        <Eye className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalle de auditoría
            <Badge variant="outline">{registro.accion}</Badge>
          </DialogTitle>
          <DialogDescription>
            {registro.entidad}
            {registro.entidadId ? ` · ${registro.entidadId}` : ""}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Fecha</dt>
            <dd>{formatDateTime(registro.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Actor</dt>
            <dd>{registro.actor ?? "—"}</dd>
          </div>
        </dl>

        <div className="space-y-4">
          <JsonBlock label="Antes" value={registro.antes} />
          <JsonBlock label="Después" value={registro.despues} />
          {registro.antes == null && registro.despues == null && (
            <p className="text-sm text-muted-foreground">
              Sin datos registrados.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
