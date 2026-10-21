import { randomInt } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/modules/auditoria/lib/audit";
import { elegiblesWhere } from "@/modules/sorteos/services/sorteo.service";
import { sorteoRepository } from "@/modules/sorteos/repositories/sorteo.repository";

type EjecucionResultado = {
  ejecucionId: string;
  estado: "COMPLETADA" | "FALLIDA";
  totalCandidatos: number;
  ganadores: string[];
};

/**
 * Ejecuta un sorteo dentro de una transacción serializada por evento:
 * advisory lock → candidatos elegibles (sin ganadores previos del evento) →
 * verificación de cantidad → selección aleatoria → ejecución + ganadores +
 * sorteo FINALIZADO. Cualquier error revierte todo salvo el registro FALLIDA
 * de candidatos insuficientes, que se confirma antes de lanzar el error.
 */
export async function ejecutarSorteo(
  sorteoId: string,
  ejecutadoPor?: string | null,
): Promise<EjecucionResultado> {
  const sorteo = await sorteoRepository.findById(sorteoId);
  if (!sorteo) throw new NotFoundError("Sorteo no encontrado");
  if (sorteo.estado !== "ACTIVO") {
    throw new ValidationError(
      `Solo se puede ejecutar un sorteo en estado ACTIVO (actual: ${sorteo.estado})`,
    );
  }
  const completada = await prisma.sorteoEjecucion.findFirst({
    where: { sorteoId, estado: "COMPLETADA" },
    select: { id: true },
  });
  if (completada) {
    throw new ConflictError("Este sorteo ya tiene una ejecución completada");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    // Serializa ejecuciones concurrentes del mismo evento
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sorteo.eventoId}))`;

    // Re-verificar dentro del lock
    const previa = await tx.sorteoEjecucion.findFirst({
      where: { sorteoId, estado: "COMPLETADA" },
      select: { id: true },
    });
    if (previa) {
      throw new ConflictError("Este sorteo ya tiene una ejecución completada");
    }

    const ganadoresPrevios = await tx.sorteoGanador.findMany({
      where: { eventoId: sorteo.eventoId },
      select: { empleadoId: true },
    });
    const where = elegiblesWhere(
      sorteo,
      ganadoresPrevios.map((g) => g.empleadoId),
    );

    const candidatos = await tx.eventoParticipante.findMany({
      where,
      select: { id: true, empleadoId: true },
    });

    const reglasActivas = sorteo.reglas.filter((r) => r.activo);
    const reglasSnapshot = reglasActivas.map((r) => ({
      entidad: r.entidad,
      campo: r.campo,
      operador: r.operador,
      valor: r.valor,
      orden: r.orden,
    }));
    const candidatosSnapshot = candidatos.map((c) => c.id);
    const base = {
      sorteoId,
      eventoId: sorteo.eventoId,
      cantidadSolicitada: sorteo.cantidadGanadores,
      totalCandidatos: candidatos.length,
      reglasSnapshot,
      candidatosSnapshot,
      ejecutadoPor: ejecutadoPor ?? null,
    };

    if (candidatos.length < sorteo.cantidadGanadores) {
      const error = `Candidatos insuficientes: se requieren ${sorteo.cantidadGanadores} y hay ${candidatos.length}`;
      const fallida = await tx.sorteoEjecucion.create({
        data: { ...base, estado: "FALLIDA", error },
      });
      await registrarAuditoria(
        {
          eventoId: sorteo.eventoId,
          entidad: "SorteoEjecucion",
          entidadId: fallida.id,
          accion: "EJECUCION_FALLIDA",
          actor: ejecutadoPor,
          despues: { sorteoId, error, totalCandidatos: candidatos.length },
        },
        tx,
      );
      return {
        ejecucionId: fallida.id,
        estado: "FALLIDA" as const,
        totalCandidatos: candidatos.length,
        ganadores: [] as string[],
      };
    }

    // Fisher-Yates con crypto.randomInt (sin sesgo de módulo)
    for (let i = candidatos.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
    }
    const seleccionados = candidatos.slice(0, sorteo.cantidadGanadores);

    const ejecucion = await tx.sorteoEjecucion.create({
      data: { ...base, estado: "COMPLETADA" },
    });
    await tx.sorteoGanador.createMany({
      data: seleccionados.map((c) => ({
        ejecucionId: ejecucion.id,
        eventoId: sorteo.eventoId,
        empleadoId: c.empleadoId,
      })),
    });
    await tx.sorteo.update({
      where: { id: sorteoId },
      data: { estado: "FINALIZADO" },
    });
    await registrarAuditoria(
      {
        eventoId: sorteo.eventoId,
        entidad: "SorteoEjecucion",
        entidadId: ejecucion.id,
        accion: "EJECUTAR_SORTEO",
        actor: ejecutadoPor,
        despues: {
          sorteoId,
          totalCandidatos: candidatos.length,
          ganadores: seleccionados.map((c) => c.empleadoId),
        },
      },
      tx,
    );

    return {
      ejecucionId: ejecucion.id,
      estado: "COMPLETADA" as const,
      totalCandidatos: candidatos.length,
      ganadores: seleccionados.map((c) => c.empleadoId),
    };
  });

  if (resultado.estado === "FALLIDA") {
    throw new ConflictError(
      `Candidatos insuficientes: se requieren ${sorteo.cantidadGanadores} y hay ${resultado.totalCandidatos}`,
      { ejecucionId: resultado.ejecucionId },
    );
  }
  return resultado;
}

export async function listEjecuciones(sorteoId: string) {
  const sorteo = await sorteoRepository.findById(sorteoId);
  if (!sorteo) throw new NotFoundError("Sorteo no encontrado");
  return prisma.sorteoEjecucion.findMany({
    where: { sorteoId },
    orderBy: { ejecutadoAt: "desc" },
    include: {
      ganadores: {
        include: {
          participante: {
            include: {
              empleado: {
                select: {
                  codigo: true,
                  nombres: true,
                  apellidos: true,
                  puesto: true,
                  departamento: true,
                  empresa: { select: { codigo: true, nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** Todos los ganadores del evento, con su sorteo y ejecución. */
export async function listGanadoresEvento(eventoId: string) {
  return prisma.sorteoGanador.findMany({
    where: { eventoId },
    orderBy: { createdAt: "asc" },
    include: {
      ejecucion: {
        select: { ejecutadoAt: true, sorteo: { select: { id: true, nombre: true } } },
      },
      participante: {
        include: {
          empleado: {
            select: {
              codigo: true,
              nombres: true,
              apellidos: true,
              puesto: true,
              departamento: true,
              empresa: { select: { codigo: true, nombre: true } },
            },
          },
        },
      },
    },
  });
}
