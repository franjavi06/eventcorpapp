"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Play, RefreshCw, Sparkles, Ticket, Trophy } from "lucide-react";
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
  modoRevelacion?: "AUTOMATICO" | "MANUAL";
  duracionAnimacionSegundos?: number;
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

const PAUSA_CELEBRACION_MS = 1800;

export function EjecucionPanel({
  eventoId,
  sorteoId,
  nombre,
  descripcion,
  estado,
  cantidadGanadores,
  modoRevelacion = "AUTOMATICO",
  duracionAnimacionSegundos = 3,
  ganadoresIniciales = [],
}: EjecucionPanelProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rollingName, setRollingName] = useState<string | null>(null);
  const [colaGanadores, setColaGanadores] = useState<GanadorInfo[] | null>(
    null,
  );
  const [reveladosCount, setReveladosCount] = useState(0);
  const [justRevealedIdx, setJustRevealedIdx] = useState<number | null>(null);
  const poolRef = useRef<string[]>([]);

  const duracionMs = Math.max(1, duracionAnimacionSegundos) * 1000;
  const enSecuencia = colaGanadores !== null;
  const ganadoresMostrados = enSecuencia
    ? colaGanadores.slice(0, reveladosCount)
    : ganadoresIniciales;
  const totalEsperado = colaGanadores?.length ?? cantidadGanadores;
  const faltanPorRevelar =
    enSecuencia && reveladosCount < colaGanadores.length;
  const ultimoRevelado =
    enSecuencia && reveladosCount > 0
      ? colaGanadores[reveladosCount - 1]
      : null;

  function animarGiro(ms: number): Promise<void> {
    const pool =
      poolRef.current.length > 0
        ? poolRef.current
        : ["SELECCIONANDO GANADOR...", "SORTEANDO..."];
    setIsSpinning(true);
    let idx = Math.floor(Math.random() * pool.length);
    setRollingName(pool[idx % pool.length]);
    const interval = setInterval(() => {
      idx++;
      setRollingName(pool[idx % pool.length]);
    }, 90);
    return new Promise((resolve) => {
      setTimeout(() => {
        clearInterval(interval);
        setIsSpinning(false);
        setRollingName(null);
        resolve();
      }, ms);
    });
  }

  async function revelarSiguiente(lista: GanadorInfo[], indice: number) {
    await animarGiro(duracionMs);
    const nuevoCount = indice + 1;
    setReveladosCount(nuevoCount);
    setJustRevealedIdx(indice);

    if (nuevoCount >= lista.length) {
      toast.success(
        `¡Sorteo completado! ${lista.length} ganador${lista.length === 1 ? "" : "es"} revelado${lista.length === 1 ? "" : "s"}`,
      );
      router.refresh();
      return;
    }

    if (modoRevelacion === "AUTOMATICO") {
      await new Promise((r) => setTimeout(r, PAUSA_CELEBRACION_MS));
      await revelarSiguiente(lista, nuevoCount);
    }
  }

  async function iniciarSorteo() {
    setIsSpinning(true);
    setJustRevealedIdx(null);
    setRollingName("PREPARANDO TÓMBOLA...");

    try {
      const elegRes = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/elegibles`,
      );
      if (elegRes.ok) {
        const elegBody = await elegRes.json();
        const items: ElegibleItem[] = elegBody.data?.data ?? [];
        poolRef.current = items.map(
          (p) =>
            `${p.empleado.nombres} ${p.empleado.apellidos} (${p.empleado.empresa.nombre})`,
        );
      }
    } catch {
      // continuar aunque falle la precarga visual
    }

    // Lanzar adjudicación en servidor en paralelo con el primer giro
    const giroPromise = animarGiro(duracionMs);
    try {
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
        await giroPromise;
        setIsSpinning(false);
        setRollingName(null);
        toast.error(body.error?.message ?? "No se pudo ejecutar el sorteo");
        router.refresh();
        return;
      }

      let adjudicados: GanadorInfo[] = [];
      const histRes = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/ejecuciones`,
      );
      if (histRes.ok) {
        const histBody = await histRes.json();
        const ejecuciones: EjecucionItem[] = histBody.data ?? [];
        const completada = ejecuciones.find((e) => e.estado === "COMPLETADA");
        if (completada) {
          adjudicados = completada.ganadores.map((g) => ({
            codigo: g.participante.empleado.codigo,
            nombre: `${g.participante.empleado.nombres} ${g.participante.empleado.apellidos}`,
            empresa: g.participante.empleado.empresa.nombre,
          }));
        }
      }

      await giroPromise;

      if (adjudicados.length === 0) {
        toast.error("No se obtuvieron ganadores");
        router.refresh();
        return;
      }

      setColaGanadores(adjudicados);
      setReveladosCount(1);
      setJustRevealedIdx(0);

      if (adjudicados.length === 1) {
        toast.success("¡Sorteo completado! 1 ganador revelado");
        router.refresh();
        return;
      }

      if (modoRevelacion === "AUTOMATICO") {
        await new Promise((r) => setTimeout(r, PAUSA_CELEBRACION_MS));
        await revelarSiguiente(adjudicados, 1);
      }
    } catch {
      await giroPromise;
      setIsSpinning(false);
      setRollingName(null);
      toast.error("Error de red al ejecutar el sorteo");
    }
  }

  const yaEjecutadoInicial =
    !enSecuencia && ganadoresIniciales.length > 0;
  const ejecutable =
    estado === "ACTIVO" && !enSecuencia && ganadoresIniciales.length === 0;
  const indiceEnGiro = enSecuencia ? reveladosCount + 1 : 1;

  return (
    <div className="flex w-full flex-col justify-between rounded-3xl border bg-card p-8">
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
        <div className="flex items-center gap-3">
          {enSecuencia && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center">
              <span className="block text-xs font-medium text-amber-500">
                Revelados
              </span>
              <span className="text-2xl font-bold text-foreground">
                {reveladosCount} / {totalEsperado}
              </span>
            </div>
          )}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-center">
            <span className="block text-xs font-medium text-indigo-500">
              Premios
            </span>
            <span className="text-2xl font-bold text-foreground">
              {cantidadGanadores}
            </span>
          </div>
        </div>
      </div>

      <div className="relative my-8 overflow-hidden rounded-3xl border bg-background/60 px-6 py-14 text-center shadow-inner">
        {isSpinning ? (
          <div className="space-y-4">
            <RefreshCw className="mx-auto size-12 animate-spin text-indigo-500" />
            <span className="block text-xs font-bold uppercase tracking-widest text-indigo-500">
              Sorteando ganador #{indiceEnGiro} de {totalEsperado}
            </span>
            <h3 className="animate-pulse text-3xl font-black tracking-wider text-indigo-500 md:text-4xl">
              {rollingName ?? "SELECCIONANDO GANADOR..."}
            </h3>
            <p className="text-xs text-muted-foreground">
              Verificando elegibilidad y seleccionando al azar...
            </p>
          </div>
        ) : ultimoRevelado ? (
          <div className="space-y-4">
            <div className="inline-flex rounded-2xl border border-amber-500/30 bg-amber-500/20 p-3 text-amber-500 shadow-xl">
              <Trophy
                className={`size-10 ${justRevealedIdx === reveladosCount - 1 ? "animate-bounce" : ""}`}
              />
            </div>
            <span className="block text-xs font-bold uppercase tracking-widest text-amber-500">
              ¡Ganador #{reveladosCount} de {totalEsperado}!
            </span>
            <div>
              <p className="text-3xl font-black text-foreground md:text-5xl">
                {ultimoRevelado.nombre}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ultimoRevelado.empresa} ·{" "}
                <span className="font-mono">{ultimoRevelado.codigo}</span>
              </p>
            </div>
          </div>
        ) : yaEjecutadoInicial ? (
          <div className="space-y-4">
            <div className="inline-flex rounded-2xl border border-amber-500/30 bg-amber-500/20 p-3 text-amber-500 shadow-xl">
              <Trophy className="size-10" />
            </div>
            <span className="block text-xs font-bold uppercase tracking-widest text-amber-500">
              {ganadoresIniciales.length === 1
                ? "Ganador Registrado"
                : `${ganadoresIniciales.length} Ganadores Registrados`}
            </span>
            <p className="text-sm text-muted-foreground">
              Este sorteo ya fue ejecutado. Consulta la lista de ganadores abajo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Ticket className="mx-auto size-12 text-indigo-500 opacity-70" />
            <h3 className="text-2xl font-bold text-foreground">
              Listo para sortear
            </h3>
            <p className="text-sm text-muted-foreground">
              {ejecutable
                ? `Haz clic abajo para iniciar la tómbola digital y revelar ${cantidadGanadores} ganador${cantidadGanadores === 1 ? "" : "es"} uno por uno (${duracionAnimacionSegundos}s por giro, modo ${modoRevelacion === "MANUAL" ? "manual" : "automático"}).`
                : "Cambia el estado del sorteo a ACTIVO para habilitar la tómbola."}
            </p>
          </div>
        )}
      </div>

      {ganadoresMostrados.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-4 text-amber-500" />
              Ganadores revelados ({ganadoresMostrados.length} de{" "}
              {yaEjecutadoInicial ? ganadoresIniciales.length : totalEsperado})
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ganadoresMostrados.map((g, idx) => (
              <div
                key={g.codigo}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition-all ${
                  enSecuencia && idx === reveladosCount - 1
                    ? "border-amber-500/50 bg-amber-500/10 shadow-md"
                    : "bg-background/60"
                }`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 font-mono text-sm font-bold text-amber-500">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">
                    {g.nombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.empresa} ·{" "}
                    <span className="font-mono">{g.codigo}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {faltanPorRevelar && modoRevelacion === "MANUAL" ? (
          <Button
            type="button"
            disabled={isSpinning}
            onClick={() =>
              colaGanadores && revelarSiguiente(colaGanadores, reveladosCount)
            }
            className="h-auto rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-10 py-4 text-base font-bold text-white shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400"
          >
            <Play className="size-5 fill-white" />
            <span>
              {isSpinning
                ? `Sorteando #${reveladosCount + 1}...`
                : `Sortear ganador #${reveladosCount + 1} de ${totalEsperado}`}
            </span>
          </Button>
        ) : (
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
                      ? `Sorteando #${indiceEnGiro} de ${totalEsperado}...`
                      : ganadoresMostrados.length > 0
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
                  {cantidadGanadores === 1 ? "" : "es"} de forma aleatoria y se
                  revelarán uno por uno (
                  {modoRevelacion === "MANUAL"
                    ? "con clic manual por cada ganador"
                    : "en secuencia automática"}
                  , {duracionAnimacionSegundos}s por giro). El sorteo pasará a
                  FINALIZADO y su configuración quedará bloqueada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setDialogOpen(false);
                    iniciarSorteo();
                  }}
                >
                  Ejecutar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
