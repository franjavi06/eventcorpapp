"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play, RefreshCw, Ticket, Trophy } from "lucide-react";
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

export type GanadorInfo = {
  codigo: string;
  nombre: string;
  empresa: string;
};

type EjecucionPanelProps = {
  eventoId: string;
  sorteoId: string;
  nombre: string;
  descripcion?: string | null;
  estado: string;
  cantidadGanadores: number;
  ganadoresIniciales?: GanadorInfo[];
};

type ElegibleItem = {
  empleado: {
    codigo: string;
    nombres: string;
    apellidos: string;
    empresa: { nombre: string };
  };
};

type EjecucionItem = {
  estado: string;
  ganadores: {
    participante: {
      empleado: {
        codigo: string;
        nombres: string;
        apellidos: string;
        empresa: { nombre: string };
      };
    };
  }[];
};

export function EjecucionPanel({
  eventoId,
  sorteoId,
  nombre,
  descripcion,
  estado,
  cantidadGanadores,
  ganadoresIniciales = [],
}: EjecucionPanelProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rollingName, setRollingName] = useState<string | null>(null);
  const [nuevosGanadores, setNuevosGanadores] = useState<GanadorInfo[] | null>(
    null,
  );
  const [justWon, setJustWon] = useState(false);
  const ganadores = nuevosGanadores ?? ganadoresIniciales;

  async function girarSorteo() {
    setIsSpinning(true);
    setJustWon(false);
    setRollingName("PREPARANDO TÓMBOLA...");

    // Cargar nombres elegibles para la animación visual
    let pool: string[] = [];
    try {
      const elegRes = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/elegibles`,
      );
      if (elegRes.ok) {
        const elegBody = await elegRes.json();
        const items: ElegibleItem[] = elegBody.data?.data ?? [];
        pool = items.map(
          (p) =>
            `${p.empleado.nombres} ${p.empleado.apellidos} (${p.empleado.empresa.nombre})`,
        );
      }
    } catch {
      // continuar aunque falle la precarga visual
    }

    const fallbackPool =
      pool.length > 0 ? pool : ["SELECCIONANDO GANADOR...", "SORTEANDO..."];
    let idx = 0;
    const interval = setInterval(() => {
      setRollingName(fallbackPool[idx % fallbackPool.length]);
      idx++;
    }, 90);

    try {
      const [res] = await Promise.all([
        fetch(`/api/eventos/${eventoId}/sorteos/${sorteoId}/ejecuciones`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        }),
        new Promise((r) => setTimeout(r, 1800)),
      ]);

      clearInterval(interval);
      const body = await res.json();

      if (!res.ok) {
        setIsSpinning(false);
        setRollingName(null);
        toast.error(body.error?.message ?? "No se pudo ejecutar el sorteo");
        router.refresh();
        return;
      }

      // Obtener detalles de los ganadores adjudicados
      let nuevosGanadores: GanadorInfo[] = [];
      const histRes = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/ejecuciones`,
      );
      if (histRes.ok) {
        const histBody = await histRes.json();
        const ejecuciones: EjecucionItem[] = histBody.data ?? [];
        const completada = ejecuciones.find((e) => e.estado === "COMPLETADA");
        if (completada) {
          nuevosGanadores = completada.ganadores.map((g) => ({
            codigo: g.participante.empleado.codigo,
            nombre: `${g.participante.empleado.nombres} ${g.participante.empleado.apellidos}`,
            empresa: g.participante.empleado.empresa.nombre,
          }));
        }
      }

      setIsSpinning(false);
      setRollingName(null);
      setNuevosGanadores(nuevosGanadores);
      setJustWon(true);
      toast.success(
        `¡Sorteo ejecutado! ${body.data?.ganadores?.length ?? nuevosGanadores.length} ganador(es)`,
      );
      router.refresh();
    } catch {
      clearInterval(interval);
      setIsSpinning(false);
      setRollingName(null);
      toast.error("Error de red al ejecutar el sorteo");
    }
  }

  const ejecutable = estado === "ACTIVO" && ganadores.length === 0;

  return (
    <div className="flex flex-col justify-between rounded-3xl border bg-card p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            Módulo de Ruleta y Premiación
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-foreground">
            {nombre}
          </h2>
          {descripcion && (
            <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
          )}
        </div>
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-center">
          <span className="block text-xs font-medium text-indigo-500">
            Premios
          </span>
          <span className="text-2xl font-bold text-foreground">
            {cantidadGanadores}
          </span>
        </div>
      </div>

      <div className="relative my-8 overflow-hidden rounded-3xl border bg-background/60 px-6 py-12 text-center shadow-inner">
        {isSpinning ? (
          <div className="space-y-4">
            <RefreshCw className="mx-auto size-12 animate-spin text-indigo-500" />
            <h3 className="animate-pulse text-2xl font-black tracking-wider text-indigo-500 md:text-3xl">
              {rollingName ?? "SELECCIONANDO GANADOR..."}
            </h3>
            <p className="text-xs text-muted-foreground">
              Verificando elegibilidad y seleccionando al azar...
            </p>
          </div>
        ) : ganadores.length > 0 ? (
          <div className="space-y-4">
            <div className="inline-flex rounded-2xl border border-amber-500/30 bg-amber-500/20 p-3 text-amber-500 shadow-xl">
              <Trophy
                className={`size-10 ${justWon ? "animate-bounce" : ""}`}
              />
            </div>
            <span className="block text-xs font-bold uppercase tracking-widest text-amber-500">
              {justWon
                ? cantidadGanadores === 1
                  ? "¡Ganador Seleccionado!"
                  : "¡Ganadores Seleccionados!"
                : cantidadGanadores === 1
                  ? "Ganador Registrado"
                  : "Ganadores Registrados"}
            </span>
            <div className="space-y-2">
              {ganadores.map((g) => (
                <div key={g.codigo}>
                  <p className="text-2xl font-black text-foreground md:text-3xl">
                    {g.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.empresa} ·{" "}
                    <span className="font-mono">{g.codigo}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Ticket className="mx-auto size-12 text-indigo-500 opacity-70" />
            <h3 className="text-2xl font-bold text-foreground">
              Listo para sortear
            </h3>
            <p className="text-sm text-muted-foreground">
              {ejecutable
                ? `Haz clic abajo para iniciar la tómbola digital y elegir ${cantidadGanadores} ganador${cantidadGanadores === 1 ? "" : "es"}.`
                : "Cambia el estado del sorteo a ACTIVO para habilitar la tómbola."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                disabled={!ejecutable || isSpinning}
                className="h-auto rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-10 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500"
              >
                <Play className="size-5 fill-white" />
                <span>
                  {isSpinning
                    ? "Sorteando..."
                    : ganadores.length > 0
                      ? "Sorteo Finalizado"
                      : "¡Girar Sorteo Ahora!"}
                </span>
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Ejecutar el sorteo?</AlertDialogTitle>
              <AlertDialogDescription>
                Se seleccionarán {cantidadGanadores} ganador
                {cantidadGanadores === 1 ? "" : "es"} de forma aleatoria. El
                sorteo pasará a FINALIZADO y su configuración quedará bloqueada.
                Esta acción queda registrada en auditoría.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setDialogOpen(false);
                  girarSorteo();
                }}
              >
                Ejecutar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
