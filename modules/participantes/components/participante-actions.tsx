"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ParticipanteActionsProps = {
  eventoId: string;
  empleadoId: string;
  nombre: string;
  tieneAsistencia: boolean;
  participaSorteos: boolean;
};

export function ParticipanteActions({
  eventoId,
  empleadoId,
  nombre,
  tieneAsistencia,
  participaSorteos,
}: ParticipanteActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [responsable, setResponsable] = useState("");

  function request(
    url: string,
    init: RequestInit,
    success: string,
    fallback: string,
  ) {
    startTransition(async () => {
      const res = await fetch(url, {
        headers: { "content-type": "application/json" },
        ...init,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error?.message ?? fallback);
        return;
      }
      toast.success(success);
      setExcluirOpen(false);
      router.refresh();
    });
  }

  const base = `/api/eventos/${eventoId}`;

  return (
    <div className="flex justify-end gap-2">
      {!tieneAsistencia && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            request(
              `${base}/asistencias`,
              { method: "POST", body: JSON.stringify({ empleadoId }) },
              "Asistencia registrada",
              "No se pudo registrar la asistencia",
            )
          }
        >
          Check-in
        </Button>
      )}
      {tieneAsistencia && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            request(
              `${base}/asistencias/${empleadoId}`,
              { method: "DELETE" },
              "Asistencia anulada",
              "No se pudo anular la asistencia",
            )
          }
        >
          Anular
        </Button>
      )}
      {participaSorteos && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setExcluirOpen(true)}
        >
          Excluir
        </Button>
      )}
      {!tieneAsistencia && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            request(
              `${base}/participantes/${empleadoId}`,
              { method: "DELETE" },
              "Participante eliminado",
              "No se pudo quitar al participante",
            )
          }
        >
          Quitar
        </Button>
      )}

      <Dialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir de sorteos</DialogTitle>
            <DialogDescription>
              {nombre} quedará fuera de los sorteos de este evento. Su
              asistencia no se ve afectada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo *</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={300}
                placeholder="Razón de la exclusión"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="responsable">Responsable</Label>
              <Input
                id="responsable"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                maxLength={150}
                placeholder="Quién autoriza la exclusión"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExcluirOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !motivo.trim()}
              onClick={() =>
                request(
                  `${base}/participantes/${empleadoId}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify({
                      motivo: motivo.trim(),
                      responsable: responsable.trim() || null,
                    }),
                  },
                  "Participante excluido de los sorteos",
                  "No se pudo excluir al participante",
                )
              }
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
