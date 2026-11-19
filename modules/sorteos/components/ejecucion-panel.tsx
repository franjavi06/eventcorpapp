"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Maximize2,
  Minimize2,
  Play,
  RefreshCw,
  Sparkles,
  Ticket,
  Trophy,
  UserPlus,
  UserX,
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
import { Input } from "@/components/ui/input";
import { useSorteoFullscreen } from "@/modules/sorteos/components/sorteo-fullscreen-container";
import { CAMPOS_CUOTA } from "@/modules/sorteos/components/cuota-builder";
import type {
  SorteosNavegacion,
  ValoresSugeridosEvento,
} from "@/modules/sorteos/services/sorteo.service";

export type GanadorInfo = {
  id?: string;
  posicion?: number;
  esReemplazo?: boolean;
  esAdicional?: boolean;
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
  navegacion?: SorteosNavegacion;
  cuotaSugerencias?: ValoresSugeridosEvento;
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
  esAdicional?: boolean;
  ganadores: {
    id: string;
    posicion: number;
    estado: string;
    reemplazaAGanadorId: string | null;
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

type ReemplazoApiData = {
  ganadorReemplazoId: string;
  posicion: number;
  reemplazo: {
    codigo: string;
    nombre: string;
    empresa: string;
    empresaCodigo: string;
    puesto: string | null;
    departamento: string | null;
  };
};

type AdicionalesApiData = {
  ejecucionId: string;
  parcial?: boolean;
  vacantes?: number;
  ganadores: {
    id: string;
    posicion: number;
    codigo: string;
    nombre: string;
    empresa: string;
    empresaCodigo: string;
    puesto: string | null;
    departamento: string | null;
  }[];
};

type ElegiblesPreviewData = {
  cantidadSolicitada: number;
  adjudicables: number;
  vacantes: number;
  alcanzaCompleta: boolean;
  cuotasResumen?: {
    id: string;
    valor: string;
    requeridos: number;
    disponibles: number;
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
  navegacion,
  cuotaSugerencias,
}: EjecucionPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const fullscreen = useSorteoFullscreen();
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const isFullscreen = fullscreen?.isFullscreen ?? localFullscreen;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rollingName, setRollingName] = useState<string | null>(null);
  const [colaGanadores, setColaGanadores] = useState<GanadorInfo[] | null>(
    null,
  );
  const [ganadoresActuales, setGanadoresActuales] =
    useState<GanadorInfo[]>(ganadoresIniciales);
  const [reemplazoDestacado, setReemplazoDestacado] =
    useState<GanadorInfo | null>(null);
  const [reemplazoTarget, setReemplazoTarget] = useState<GanadorInfo | null>(
    null,
  );
  const [motivoReemplazo, setMotivoReemplazo] = useState("");
  const [reemplazando, setReemplazando] = useState(false);
  const [adicionalesOpen, setAdicionalesOpen] = useState(false);
  const [adicionalesCantidad, setAdicionalesCantidad] = useState("1");
  const [adicionalesMotivo, setAdicionalesMotivo] = useState("");
  const [adicionalesCampoKey, setAdicionalesCampoKey] = useState("LIBRE");
  const [adicionalesValor, setAdicionalesValor] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [adicionalesParcial, setAdicionalesParcial] = useState(false);
  const [previewInicio, setPreviewInicio] =
    useState<ElegiblesPreviewData | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [reveladosCount, setReveladosCount] = useState(0);
  const [justRevealedIdx, setJustRevealedIdx] = useState<number | null>(null);
  const poolRef = useRef<string[]>([]);
  const winnersListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFullscreenChange() {
      setLocalFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // Al desmontarse (cambio de sorteo o salida de la ruleta), si la navegación
  // no sigue en una pantalla /ejecutar, salir de pantalla completa.
  useEffect(() => {
    return () => {
      setTimeout(() => {
        if (
          document.fullscreenElement &&
          !window.location.pathname.endsWith("/ejecutar")
        ) {
          document.exitFullscreen().catch(() => {});
        }
      }, 0);
    };
  }, []);

  async function toggleFullscreen() {
    if (fullscreen) {
      await fullscreen.toggleFullscreen();
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setLocalFullscreen(false);
      } else if (panelRef.current?.requestFullscreen) {
        await panelRef.current.requestFullscreen();
        setLocalFullscreen(true);
      } else {
        setLocalFullscreen((v) => !v);
      }
    } catch {
      // Fallback por si el navegador bloquea la API de pantalla completa
      setLocalFullscreen((v) => !v);
    }
  }

  const duracionMs = Math.max(1, duracionAnimacionSegundos) * 1000;
  const enSecuencia = colaGanadores !== null;
  const ganadoresMostrados = enSecuencia
    ? colaGanadores.slice(0, reveladosCount)
    : ganadoresActuales;
  const totalEsperado = colaGanadores?.length ?? cantidadGanadores;
  const faltanPorRevelar =
    enSecuencia && reveladosCount < colaGanadores.length;
  const ultimoRevelado =
    enSecuencia && reveladosCount > 0
      ? colaGanadores[reveladosCount - 1]
      : null;
  const destacado = reemplazoDestacado ?? ultimoRevelado;

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
    setReemplazoDestacado(null);

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

  // Al revelarse un nuevo ganador, volver al tope del listado (el más
  // reciente se muestra primero).
  useEffect(() => {
    if (reveladosCount > 0) {
      winnersListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [reveladosCount]);

  // Al abrir la confirmación del giro, consultar cuántos premios son
  // adjudicables con la configuración actual (aviso de sorteo parcial).
  function onDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setPreviewInicio(null);
      setCargandoPreview(false);
      return;
    }
    setCargandoPreview(true);
    setPreviewInicio(null);
    fetch(`/api/eventos/${eventoId}/sorteos/${sorteoId}/elegibles`)
      .then((r) => r.json())
      .then((body) => setPreviewInicio(body.data ?? null))
      .catch(() => {})
      .finally(() => setCargandoPreview(false));
  }

  async function iniciarSorteo(permitirParcial = false) {
    setIsSpinning(true);
    setJustRevealedIdx(null);
    setReemplazoDestacado(null);
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
          body: JSON.stringify({ permitirParcial }),
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

      const ejecucionParcial = body.data?.estado === "PARCIAL";

      let adjudicados: GanadorInfo[] = [];
      const histRes = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/ejecuciones`,
      );
      if (histRes.ok) {
        const histBody = await histRes.json();
        const ejecuciones: EjecucionItem[] = histBody.data ?? [];
        const completada = ejecuciones.find(
          (e) => e.estado === "COMPLETADA" || e.estado === "PARCIAL",
        );
        if (completada) {
          adjudicados = completada.ganadores
            .filter((g) => g.estado === "VALIDO")
            .map((g) => ({
              id: g.id,
              posicion: g.posicion,
              esReemplazo: g.reemplazaAGanadorId !== null,
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

      if (ejecucionParcial) {
        toast.warning(
          `Sorteo parcial: se adjudicaron ${adjudicados.length} de ${cantidadGanadores} premio(s). Los cupos restantes quedaron vacantes.`,
        );
      }

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

  async function ejecutarReemplazo() {
    const target = reemplazoTarget;
    if (!target?.id) return;
    setReemplazoTarget(null);
    setReemplazando(true);
    const motivo = motivoReemplazo.trim() || null;
    const giro = animarGiro(duracionMs);
    try {
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/ganadores/${target.id}/reemplazar`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ motivo }),
        },
      );
      const body = await res.json();
      await giro;
      if (!res.ok) {
        toast.error(
          body.error?.message ?? "No se pudo reemplazar al ganador",
        );
        return;
      }
      const data = body.data as ReemplazoApiData;
      const nuevo: GanadorInfo = {
        id: data.ganadorReemplazoId,
        posicion: data.posicion,
        esReemplazo: true,
        codigo: data.reemplazo.codigo,
        nombre: data.reemplazo.nombre,
        empresa: data.reemplazo.empresa,
        empresaCodigo: data.reemplazo.empresaCodigo,
        puesto: data.reemplazo.puesto,
        departamento: data.reemplazo.departamento,
      };
      const sustituir = (lista: GanadorInfo[]) =>
        lista.map((g) => (g.id === target.id ? nuevo : g));
      const idxReemplazado = (enSecuencia
        ? colaGanadores
        : ganadoresActuales
      )?.findIndex((g) => g.id === target.id);
      if (enSecuencia) {
        setColaGanadores((prev) => (prev ? sustituir(prev) : prev));
      } else {
        setGanadoresActuales((prev) => sustituir(prev));
      }
      setReemplazoDestacado(nuevo);
      setJustRevealedIdx(idxReemplazado ?? (nuevo.posicion ?? 1) - 1);
      toast.success(
        `Reemplazo confirmado: ${nuevo.nombre} recibe el premio #${nuevo.posicion}`,
      );
    } catch {
      await giro;
      toast.error("Error de red al reemplazar al ganador");
    } finally {
      setReemplazando(false);
    }
  }

  async function ejecutarAdicionales() {
    const cantidad = Number(adicionalesCantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) return;
    setAdicionalesOpen(false);
    setAdicionando(true);
    try {
      const campoSel = CAMPOS_CUOTA.find((c) => c.key === adicionalesCampoKey);
      const cuota =
        campoSel && adicionalesValor.trim()
          ? {
              entidad: campoSel.entidad,
              campo: campoSel.campo,
              valor: adicionalesValor.trim(),
            }
          : null;
      const res = await fetch(
        `/api/eventos/${eventoId}/sorteos/${sorteoId}/ganadores-adicionales`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cantidad,
            motivo: adicionalesMotivo.trim() || null,
            cuota,
            permitirParcial: adicionalesParcial,
          }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        toast.error(
          body.error?.message ?? "No se pudieron sortear ganadores adicionales",
        );
        router.refresh();
        return;
      }
      const data = body.data as AdicionalesApiData;
      if (data.parcial) {
        toast.warning(
          `Sorteo parcial: se adjudicaron ${data.ganadores.length} de ${cantidad} ganador(es) adicional(es). Los cupos restantes quedaron vacantes.`,
        );
      }
      const nuevos: GanadorInfo[] = data.ganadores.map((g) => ({
        id: g.id,
        posicion: g.posicion,
        esAdicional: true,
        codigo: g.codigo,
        nombre: g.nombre,
        empresa: g.empresa,
        empresaCodigo: g.empresaCodigo,
        puesto: g.puesto,
        departamento: g.departamento,
      }));
      const prev = enSecuencia
        ? colaGanadores.slice(0, reveladosCount)
        : ganadoresActuales;
      const lista = [...prev, ...nuevos];
      setColaGanadores(lista);
      setReveladosCount(prev.length);
      setReemplazoDestacado(null);
      if (modoRevelacion === "AUTOMATICO") {
        await revelarSiguiente(lista, prev.length);
      } else {
        toast.success(
          `${nuevos.length} ganador${nuevos.length === 1 ? "" : "es"} adicional${nuevos.length === 1 ? "" : "es"} listo${nuevos.length === 1 ? "" : "s"} para revelar`,
        );
      }
    } catch {
      toast.error("Error de red al agregar ganadores adicionales");
    } finally {
      setAdicionando(false);
    }
  }

  function opcionesCuotaAdicional(): string[] {
    const sel = CAMPOS_CUOTA.find((c) => c.key === adicionalesCampoKey);
    if (!sel || !cuotaSugerencias) return [];
    if (sel.entidad === "EMPLEADO") {
      if (sel.campo === "departamento") return cuotaSugerencias.departamentos;
      if (sel.campo === "clasificacion")
        return cuotaSugerencias.clasificaciones;
      if (sel.campo === "zona") return cuotaSugerencias.zonas;
      if (sel.campo === "puesto") return cuotaSugerencias.puestos;
    }
    if (sel.entidad === "EMPRESA" && sel.campo === "codigo") {
      return cuotaSugerencias.empresasCodigos;
    }
    return [];
  }

  const yaEjecutadoInicial =
    !enSecuencia && ganadoresIniciales.length > 0;
  const ejecutable =
    estado === "ACTIVO" && !enSecuencia && ganadoresIniciales.length === 0;
  const indiceEnGiro = enSecuencia ? reveladosCount + 1 : 1;
  const cargoUltimo = destacado ? formatCargo(destacado) : null;

  return (
    <div
      ref={panelRef}
      className={`flex w-full flex-col bg-card ${
        isFullscreen
          ? "fixed inset-0 z-50 h-dvh gap-4 overflow-y-auto rounded-none border-0 px-8 py-6"
          : "gap-6 rounded-3xl border p-8"
      }`}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
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
        <div className="flex flex-wrap items-center gap-3">
          {navegacion?.anterior && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSpinning}
              onClick={() =>
                router.push(
                  `/eventos/${eventoId}/sorteos/${navegacion.anterior!.id}/ejecutar`,
                )
              }
              title={`Anterior: ${navegacion.anterior.nombre}`}
            >
              <ArrowLeft className="size-4" />
              Anterior
            </Button>
          )}
          {navegacion?.siguiente && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSpinning}
              onClick={() =>
                router.push(
                  `/eventos/${eventoId}/sorteos/${navegacion.siguiente!.id}/ejecutar`,
                )
              }
              title={`Próximo: ${navegacion.siguiente.nombre}`}
            >
              Próximo sorteo
              <ArrowRight className="size-4" />
            </Button>
          )}
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
              {Math.max(cantidadGanadores, ganadoresMostrados.length)}
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
        <div
          className={`flex shrink-0 flex-wrap items-center justify-center gap-4 rounded-2xl border bg-background/50 px-5 ${
            isFullscreen ? "py-2.5" : "py-4"
          }`}
        >
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

      <div
        className={`relative shrink-0 overflow-hidden rounded-3xl border bg-background/60 px-6 text-center shadow-inner ${
          isFullscreen ? "py-7" : "py-14"
        }`}
      >
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
        ) : destacado ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <EmpleadoAvatar
                  empresaCodigo={destacado.empresaCodigo}
                  empleadoCodigo={destacado.codigo}
                  nombre={destacado.nombre}
                  size="xl"
                  className="border-2 border-amber-500/50 shadow-2xl"
                />
                <span className="absolute -right-2 -bottom-2 inline-flex rounded-xl border border-amber-500/40 bg-amber-500 p-1.5 text-white shadow-lg">
                  <Trophy
                    className={`size-5 ${reemplazoDestacado ? "animate-bounce" : justRevealedIdx === reveladosCount - 1 ? "animate-bounce" : ""}`}
                  />
                </span>
              </div>
            </div>
            <span className="block text-xs font-bold uppercase tracking-widest text-amber-500">
              ¡Ganador #{destacado.posicion ?? reveladosCount} de{" "}
              {totalEsperado}!
              {destacado.esReemplazo
                ? " Reemplazo"
                : destacado.esAdicional
                  ? " Adicional"
                  : ""}
            </span>
            <div className="space-y-1.5">
              <p className="text-3xl font-black text-foreground md:text-5xl">
                {destacado.nombre}
              </p>
              {cargoUltimo && (
                <p className="inline-flex items-center gap-1.5 text-base font-semibold text-indigo-500 md:text-lg">
                  <Briefcase className="size-4 shrink-0" />
                  {cargoUltimo}
                </p>
              )}
              <p className="flex items-center justify-center gap-2.5 text-base text-muted-foreground">
                <EmpresaLogo
                  empresaCodigo={destacado.empresaCodigo}
                  nombre={destacado.empresa}
                  size="sm"
                />
                <span className="font-semibold text-foreground">
                  {destacado.empresa}
                </span>
                <span>·</span>
                <span className="font-mono">{destacado.codigo}</span>
              </p>
              {destacado.id && !isSpinning && !reemplazando && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setReemplazoTarget(destacado)}
                >
                  <UserX className="size-3.5" />
                  No presente — reemplazar
                </Button>
              )}
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

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
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
          <AlertDialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
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
              {cargandoPreview && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="size-3.5 animate-spin" />
                  Verificando elegibles disponibles…
                </p>
              )}
              {previewInicio && !previewInicio.alcanzaCompleta && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-left text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    {previewInicio.adjudicables > 0 ? (
                      <>
                        <p className="font-semibold">
                          Candidatos insuficientes: se solicitan{" "}
                          {previewInicio.cantidadSolicitada} premio(s) pero solo
                          se pueden adjudicar {previewInicio.adjudicables}.{" "}
                          {previewInicio.vacantes} cupo(s) quedarán vacantes.
                        </p>
                        {previewInicio.cuotasResumen?.some(
                          (c) => c.disponibles < c.requeridos,
                        ) && (
                          <ul className="list-inside list-disc">
                            {previewInicio.cuotasResumen
                              .filter((c) => c.disponibles < c.requeridos)
                              .map((c) => (
                                <li key={c.id}>
                                  Cuota {c.valor}: {c.disponibles} de{" "}
                                  {c.requeridos} disponible(s) — los faltantes
                                  quedan vacantes
                                </li>
                              ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <p className="font-semibold">
                        No hay candidatos elegibles adjudicables con la
                        configuración actual. No es posible ejecutar el sorteo.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={
                    cargandoPreview || previewInicio?.adjudicables === 0
                  }
                  onClick={() => {
                    const parcial =
                      previewInicio !== null && !previewInicio.alcanzaCompleta;
                    setDialogOpen(false);
                    iniciarSorteo(parcial);
                  }}
                >
                  {previewInicio &&
                  !previewInicio.alcanzaCompleta &&
                  previewInicio.adjudicables > 0
                    ? `Ejecutar con ${previewInicio.adjudicables} disponible(s)`
                    : "Ejecutar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {!faltanPorRevelar && ganadoresMostrados.length > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={isSpinning || reemplazando || adicionando}
            onClick={() => setAdicionalesOpen(true)}
            className="h-auto rounded-2xl border-emerald-500/40 px-6 py-4 text-base font-bold text-emerald-600 shadow-sm hover:bg-emerald-500/10 hover:text-emerald-600"
          >
            <UserPlus className="size-5" />
            Agregar ganador
          </Button>
        )}

        {!faltanPorRevelar &&
          !isSpinning &&
          ganadoresMostrados.length > 0 &&
          navegacion?.siguiente && (
            <Button
              type="button"
              onClick={() =>
                router.push(
                  `/eventos/${eventoId}/sorteos/${navegacion.siguiente!.id}/ejecutar`,
                )
              }
              className="h-auto rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500"
            >
              <span>Próximo sorteo: {navegacion.siguiente.nombre}</span>
              <ArrowRight className="size-5" />
            </Button>
          )}
      </div>

      {ganadoresMostrados.length > 0 && (
        <div
          className={
            isFullscreen
              ? "flex min-h-[10rem] flex-1 flex-col gap-2.5 overflow-hidden"
              : "mb-8 space-y-3"
          }
        >
          <div className="flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-4 text-amber-500" />
              Ganadores revelados ({ganadoresMostrados.length} de{" "}
              {yaEjecutadoInicial ? ganadoresIniciales.length : totalEsperado})
            </h3>
          </div>
          <div
            ref={winnersListRef}
            className={`pr-1 ${
              isFullscreen
                ? "min-h-0 flex-1 overflow-y-auto"
                : "max-h-96 overflow-y-auto"
            }`}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ganadoresMostrados
              .map((g, idx) => ({ g, idx }))
              .reverse()
              .map(({ g, idx }) => {
                const cargo = formatCargo(g);
                return (
                  <div
                    key={g.id ?? g.codigo}
                    className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                      idx === justRevealedIdx
                        ? "border-amber-500/50 bg-amber-500/10 shadow-md"
                        : "bg-background/60"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 font-mono text-sm font-bold text-amber-500">
                      #{g.posicion ?? idx + 1}
                    </span>
                    <EmpleadoAvatar
                      empresaCodigo={g.empresaCodigo}
                      empleadoCodigo={g.codigo}
                      nombre={g.nombre}
                      size="md"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-foreground">
                          {g.nombre}
                        </p>
                        {g.esReemplazo && (
                          <span className="shrink-0 rounded-md bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-600">
                            Reemplazo
                          </span>
                        )}
                        {g.esAdicional && (
                          <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                            Adicional
                          </span>
                        )}
                      </div>
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
                    {g.id && !isSpinning && !reemplazando && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="No presente — sortear reemplazo"
                        onClick={() => setReemplazoTarget(g)}
                        className="shrink-0 text-muted-foreground hover:text-rose-500"
                      >
                        <UserX className="size-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={reemplazoTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReemplazoTarget(null);
            setMotivoReemplazo("");
          }
        }}
      >
        <AlertDialogContent container={panelRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Ganador no presente?</AlertDialogTitle>
            <AlertDialogDescription>
              {reemplazoTarget?.nombre ?? "El ganador"} será marcado como no
              presente y se sorteará un reemplazo elegible para el premio #
              {reemplazoTarget?.posicion ?? ""} al instante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label
              htmlFor="motivo-reemplazo"
              className="text-xs font-medium text-muted-foreground"
            >
              Motivo (opcional)
            </label>
            <Input
              id="motivo-reemplazo"
              value={motivoReemplazo}
              onChange={(e) => setMotivoReemplazo(e.target.value)}
              placeholder="No presente"
              maxLength={300}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void ejecutarReemplazo()}>
              Reemplazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={adicionalesOpen}
        onOpenChange={(open) => {
          setAdicionalesOpen(open);
          if (!open) {
            setAdicionalesCantidad("1");
            setAdicionalesMotivo("");
            setAdicionalesCampoKey("LIBRE");
            setAdicionalesValor("");
            setAdicionalesParcial(false);
          }
        }}
      >
        <AlertDialogContent container={panelRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>Agregar ganadores adicionales</AlertDialogTitle>
            <AlertDialogDescription>
              Se sortearán premios adicionales entre los elegibles que aún no
              han ganado en este evento, aplicando las mismas reglas y
              asistencia del sorteo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="adicionales-cantidad"
                className="text-xs font-medium text-muted-foreground"
              >
                Cantidad de ganadores
              </label>
              <Input
                id="adicionales-cantidad"
                type="number"
                min={1}
                max={100}
                value={adicionalesCantidad}
                onChange={(e) => setAdicionalesCantidad(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="adicionales-cuota"
                className="text-xs font-medium text-muted-foreground"
              >
                Restringir por cuota (opcional)
              </label>
              <select
                id="adicionales-cuota"
                value={adicionalesCampoKey}
                onChange={(e) => {
                  setAdicionalesCampoKey(e.target.value);
                  setAdicionalesValor("");
                }}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="LIBRE">Libre entre elegibles</option>
                {CAMPOS_CUOTA.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              {adicionalesCampoKey !== "LIBRE" && (
                <>
                  <Input
                    value={adicionalesValor}
                    onChange={(e) => setAdicionalesValor(e.target.value)}
                    placeholder="Valor de la cuota (vacío = libre)"
                    maxLength={300}
                    list="adicionales-cuota-valores"
                  />
                  <datalist id="adicionales-cuota-valores">
                    {opcionesCuotaAdicional().map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="adicionales-motivo"
                className="text-xs font-medium text-muted-foreground"
              >
                Motivo (opcional)
              </label>
              <Input
                id="adicionales-motivo"
                value={adicionalesMotivo}
                onChange={(e) => setAdicionalesMotivo(e.target.value)}
                placeholder="Premio extra, ganador no reclamó, etc."
                maxLength={300}
              />
            </div>
            <label
              htmlFor="adicionales-parcial"
              className="flex items-start gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs"
            >
              <input
                id="adicionales-parcial"
                type="checkbox"
                checked={adicionalesParcial}
                onChange={(e) => setAdicionalesParcial(e.target.checked)}
                className="mt-0.5 size-4 accent-emerald-600"
              />
              <span>
                <span className="font-semibold text-foreground">
                  Permitir sorteo parcial
                </span>
                <span className="block text-muted-foreground">
                  Si no hay suficientes candidatos, adjudicar solo los cupos
                  disponibles y dejar el resto vacantes.
                </span>
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void ejecutarAdicionales()}>
              Sortear adicionales
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
