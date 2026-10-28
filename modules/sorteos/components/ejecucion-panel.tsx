"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";
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
import { EmpleadoAvatar } from "@/components/shared/empleado-avatar";
import { EmpresaLogo } from "@/components/shared/empresa-logo";
import { Button } from "@/components/ui/button";

export type GanadorInfo = {
  codigo: string;
  nombre: string;
  empresa: string;
  empresaCodigo?: string | null;
  puesto?: string | null;
  departamento?: string | null;
};

export type EmpresaParticipanteInfo = {
  id: string;
  codigo: string;
  nombre: string;
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
  empresasParticipantes?: EmpresaParticipanteInfo[];
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
        puesto: string | null;
        departamento: string | null;
        empresa: { codigo: string; nombre: string };
      };
    };
  }[];
};

const PAUSA_CELEBRACION_MS = 1800;

function formatCargo(g: { puesto?: string | null; departamento?: string | null }) {
  const parts = [g.puesto, g.departamento].filter(
    (v): v is string => !!v && v.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

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
  empresasParticipantes = [],
}: EjecucionPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rollingName, setRollingName] = useState<string | null>(null);
  const [colaGanadores, setColaGanadores] = useState<GanadorInfo[] | null>(
    null,
  );
  const [reveladosCount, setReveladosCount] = useState(0);
  const [justRevealedIdx, setJustRevealedIdx] = useState<number | null>(null);
  const poolRef = useRef<string[]>([]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
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
      // Fallback por si el navegador bloquea la API de pantalla completa
      setIsFullscreen((v) => !v);
    }
  }

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
            empresaCodigo: g.participante.empleado.empresa.codigo,
            puesto: g.participante.empleado.puesto,
            departamento: g.participante.empleado.departamento,
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
  const cargoUltimo = ultimoRevelado ? formatCargo(ultimoRevelado) : null;

  return (
    <div
      ref={panelRef}
      className={`flex w-full flex-col justify-between bg-card p-8 ${
        isFullscreen
          ? "fixed inset-0 z-50 min-h-screen overflow-y-auto rounded-none border-0 p-10"
          : "rounded-3xl border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            Módulo de Ruleta y Premiación
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-foreground md:text-3xl">
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
      </div>

      {empresasParticipantes.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 rounded-2xl border bg-background/50 px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Empresas participantes:
          </span>
          {empresasParticipantes.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-2 shadow-xs"
            >
              <EmpresaLogo
                empresaCodigo={emp.codigo}
                nombre={emp.nombre}
                size="lg"
              />
              <span className="text-sm font-bold text-foreground">
                {emp.nombre}
              </span>
            </div>
          ))}
        </div>
      )}

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
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <EmpleadoAvatar
                  empresaCodigo={ultimoRevelado.empresaCodigo}
                  empleadoCodigo={ultimoRevelado.codigo}
                  nombre={ultimoRevelado.nombre}
                  size="xl"
                  className="border-2 border-amber-500/50 shadow-2xl"
                />
                <span className="absolute -right-2 -bottom-2 inline-flex rounded-xl border border-amber-500/40 bg-amber-500 p-1.5 text-white shadow-lg">
                  <Trophy
                    className={`size-5 ${justRevealedIdx === reveladosCount - 1 ? "animate-bounce" : ""}`}
                  />
                </span>
              </div>
            </div>
            <span className="block text-xs font-bold uppercase tracking-widest text-amber-500">
              ¡Ganador #{reveladosCount} de {totalEsperado}!
            </span>
            <div className="space-y-1.5">
              <p className="text-3xl font-black text-foreground md:text-5xl">
                {ultimoRevelado.nombre}
              </p>
              {cargoUltimo && (
                <p className="inline-flex items-center gap-1.5 text-base font-semibold text-indigo-500 md:text-lg">
                  <Briefcase className="size-4 shrink-0" />
                  {cargoUltimo}
                </p>
              )}
              <p className="flex items-center justify-center gap-2.5 text-base text-muted-foreground">
                <EmpresaLogo
                  empresaCodigo={ultimoRevelado.empresaCodigo}
                  nombre={ultimoRevelado.empresa}
                  size="sm"
                />
                <span className="font-semibold text-foreground">
                  {ultimoRevelado.empresa}
                </span>
                <span>·</span>
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
            {ganadoresMostrados
              .map((g, idx) => ({ g, idx }))
              .reverse()
              .map(({ g, idx }) => {
                const cargo = formatCargo(g);
                return (
                  <div
                    key={g.codigo}
                    className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                      enSecuencia && idx === reveladosCount - 1
                        ? "border-amber-500/50 bg-amber-500/10 shadow-md"
                        : "bg-background/60"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 font-mono text-sm font-bold text-amber-500">
                      #{idx + 1}
                    </span>
                    <EmpleadoAvatar
                      empresaCodigo={g.empresaCodigo}
                      empleadoCodigo={g.codigo}
                      nombre={g.nombre}
                      size="md"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-bold text-foreground">
                        {g.nombre}
                      </p>
                      {cargo && (
                        <p className="truncate text-xs font-medium text-indigo-500">
                          {cargo}
                        </p>
                      )}
                      <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                        <EmpresaLogo
                          empresaCodigo={g.empresaCodigo}
                          nombre={g.empresa}
                          size="sm"
                        />
                        <span className="truncate font-medium text-foreground">
                          {g.empresa}
                        </span>
                        <span>·</span>
                        <span className="font-mono">{g.codigo}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
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
            <AlertDialogContent container={panelRef}>
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
