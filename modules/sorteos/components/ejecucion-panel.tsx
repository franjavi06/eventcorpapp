"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dices } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type EjecucionPanelProps = {
  eventoId: string;
  sorteoId: string;
  estado: string;
  cantidadGanadores: number;
};

export function EjecucionPanel({
  eventoId,
  sorteoId,
  estado,
  cantidadGanadores,
}: EjecucionPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<string | null>(null);

  function ejecutar() {
    startTransition(async () => {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/ejecuciones`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo ejecutar el sorteo");
        router.refresh();
        return;
      }
      const { estado: est, ganadores } = body.data;
      if (est === "COMPLETADA") {
        toast.success(`Sorteo ejecutado: ${ganadores.length} ganadores`);
        setResultado(`${ganadores.length} ganadores seleccionados`);
      }
      router.refresh();
    });
  }

  const ejecutable = estado === "ACTIVO";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ejecución</CardTitle>
        <CardDescription>
          Selecciona aleatoriamente {cantidadGanadores} ganador
          {cantidadGanadores === 1 ? "" : "es"} entre los candidatos elegibles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button type="button" disabled={!ejecutable || pending}>
                <Dices className="size-4" />
                {pending ? "Ejecutando…" : "Ejecutar sorteo"}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Ejecutar el sorteo?</AlertDialogTitle>
              <AlertDialogDescription>
                Se seleccionarán {cantidadGanadores} ganadores de forma
                aleatoria. El sorteo pasará a FINALIZADO y su configuración
                quedará bloqueada. Esta acción queda registrada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={ejecutar}>Ejecutar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {!ejecutable && (
          <p className="text-sm text-muted-foreground">
            El sorteo debe estar en estado ACTIVO para poder ejecutarse.
          </p>
        )}
        {resultado && <p className="text-sm">{resultado}</p>}
      </CardContent>
    </Card>
  );
}
