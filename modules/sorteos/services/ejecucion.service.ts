import { randomInt } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/modules/auditoria/lib/audit";
import {
  candidatoCumpleCuota,
  elegiblesWhere,
  seleccionarCandidatosConCuotas,
} from "@/modules/sorteos/services/sorteo.service";
import { sorteoRepository } from "@/modules/sorteos/repositories/sorteo.repository";

type EjecucionResultado = {
  ejecucionId: string;
  estado: "COMPLETADA" | "PARCIAL" | "FALLIDA";
  totalCandidatos: number;
  ganadores: string[];
};

/**
 * Ejecuta un sorteo dentro de una transacción serializada por evento:
 * advisory lock → candidatos elegibles (sin ganadores previos del evento) →
 * verificación de cantidad → selección aleatoria → ejecución + ganadores +
 * sorteo FINALIZADO. Cualquier error revierte todo salvo el registro FALLIDA
 * de candidatos insuficientes, que se confirma antes de lanzar el error.
 * Con `permitirParcial: true`, si faltan candidatos se adjudican solo los
 * cupos cubiertos (cuotas incompletas quedan vacantes) y la ejecución queda
 * registrada como PARCIAL.
 */
export async function ejecutarSorteo(
  sorteoId: string,
  ejecutadoPor?: string | null,
  opciones?: { permitirParcial?: boolean },
): Promise<EjecucionResultado> {
  const sorteo = await sorteoRepository.findById(sorteoId);
  if (!sorteo) throw new NotFoundError("Sorteo no encontrado");
  if (sorteo.estado !== "ACTIVO") {
    throw new ValidationError(
      `Solo se puede ejecutar un sorteo en estado ACTIVO (actual: ${sorteo.estado})`,
    );
  }
  const completada = await prisma.sorteoEjecucion.findFirst({
    where: { sorteoId, estado: { in: ["COMPLETADA", "PARCIAL"] } },
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
      where: { sorteoId, estado: { in: ["COMPLETADA", "PARCIAL"] } },
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
      select: {
        id: true,
        empleadoId: true,
        empleado: {
          select: {
            codigo: true,
            departamento: true,
            clasificacion: true,
            zona: true,
            puesto: true,
            empresa: {
              select: {
                codigo: true,
                clasificacion: true,
                ubicacion: true,
              },
            },
          },
        },
      },
    });

    const reglasActivas = sorteo.reglas.filter((r) => r.activo);
    const cuotasActivas = sorteo.cuotas.filter((c) => c.activo);
    const reglasSnapshot = [
      ...reglasActivas.map((r) => ({
        tipo: "REGLA" as const,
        entidad: r.entidad,
        campo: r.campo,
        operador: r.operador,
        valor: r.valor,
        orden: r.orden,
      })),
      ...cuotasActivas.map((c) => ({
        tipo: "CUOTA" as const,
        entidad: c.entidad,
        campo: c.campo,
        valor: c.valor,
        cantidad: c.cantidad,
        orden: c.orden,
      })),
    ];
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

    const seleccion = seleccionarCandidatosConCuotas(
      candidatos,
      sorteo.cantidadGanadores,
      cuotasActivas,
      { permitirParcial: opciones?.permitirParcial },
    );

    if (!seleccion.ok) {
      const error = seleccion.error;
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
        error,
      };
    }

    const seleccionados = seleccion.seleccionados;
    const estadoFinal: "COMPLETADA" | "PARCIAL" = seleccion.parcial
      ? "PARCIAL"
      : "COMPLETADA";
    const detalleParcial = seleccion.parcial
      ? seleccion.faltantesDetalle.join("; ")
      : null;

    const ejecucion = await tx.sorteoEjecucion.create({
      data: {
        ...base,
        estado: estadoFinal,
        error: detalleParcial,
      },
    });
    await tx.sorteoGanador.createMany({
      data: seleccionados.map((c, idx) => ({
        ejecucionId: ejecucion.id,
        eventoId: sorteo.eventoId,
        empleadoId: c.empleadoId,
        posicion: idx + 1,
        cuotaSnapshot: seleccion.cuotasAsignadas[idx] ?? undefined,
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
          cantidadSolicitada: sorteo.cantidadGanadores,
          adjudicados: seleccionados.length,
          parcial: seleccion.parcial,
          vacantes: seleccion.vacantes,
          ganadores: seleccionados.map((c) => c.empleadoId),
        },
      },
      tx,
    );

    return {
      ejecucionId: ejecucion.id,
      estado: estadoFinal,
      totalCandidatos: candidatos.length,
      ganadores: seleccionados.map((c) => c.empleadoId),
    };
  });

  if (resultado.estado === "FALLIDA") {
    throw new ConflictError(resultado.error ?? "La ejecución falló", {
      ejecucionId: resultado.ejecucionId,
    });
  }
  return resultado;
}

export type ReemplazoResultado = {
  ganadorAusenteId: string;
  ganadorReemplazoId: string;
  posicion: number;
  reemplazo: {
    empleadoId: string;
    codigo: string;
    nombre: string;
    empresa: string;
    empresaCodigo: string;
    puesto: string | null;
    departamento: string | null;
  };
};

/**
 * Marca un ganador como AUSENTE y sortea un reemplazo en la misma transacción.
 * El reemplazo conserva `posicion` y, si el puesto cubría una cuota, solo se
 * elige entre candidatos que cumplan esa cuota. Los empleados ya ganadores del
 * evento (VALIDO o AUSENTE) quedan excluidos del pool.
 */
export async function reemplazarGanadorAusente(
  eventoId: string,
  sorteoId: string,
  ganadorId: string,
  motivo?: string | null,
  actor?: string | null,
): Promise<ReemplazoResultado> {
  const sorteo = await sorteoRepository.findById(sorteoId);
  if (!sorteo || sorteo.eventoId !== eventoId) {
    throw new NotFoundError("Sorteo no encontrado");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sorteo.eventoId}))`;

    const ganador = await tx.sorteoGanador.findFirst({
      where: {
        id: ganadorId,
        eventoId: sorteo.eventoId,
        ejecucion: {
          sorteoId,
          estado: { in: ["COMPLETADA", "PARCIAL"] },
        },
      },
      include: {
        ejecucion: { select: { esAdicional: true } },
        participante: {
          include: {
            empleado: {
              select: {
                codigo: true,
                nombres: true,
                apellidos: true,
                departamento: true,
                clasificacion: true,
                zona: true,
                puesto: true,
                empresa: {
                  select: {
                    codigo: true,
                    clasificacion: true,
                    ubicacion: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!ganador) {
      throw new NotFoundError("Ganador no encontrado en este sorteo");
    }
    if (ganador.estado !== "VALIDO") {
      throw new ConflictError(
        "Este ganador ya fue marcado como no presente y reemplazado",
      );
    }

    const previos = await tx.sorteoGanador.findMany({
      where: { eventoId: sorteo.eventoId },
      select: { empleadoId: true },
    });
    const where = elegiblesWhere(
      sorteo,
      previos.map((g) => g.empleadoId),
    );
    const candidatos = await tx.eventoParticipante.findMany({
      where,
      select: {
        id: true,
        empleadoId: true,
        empleado: {
          select: {
            codigo: true,
            nombres: true,
            apellidos: true,
            departamento: true,
            clasificacion: true,
            zona: true,
            puesto: true,
            empresa: {
              select: {
                codigo: true,
                nombre: true,
                clasificacion: true,
                ubicacion: true,
              },
            },
          },
        },
      },
    });

    // Cuota del puesto: snapshot en BD o, para ganadores creados antes del
    // snapshot, inferida si el empleado ausente cumple exactamente una cuota.
    // Los ganadores de ejecuciones adicionales libres no deben heredar las
    // cuotas originales del sorteo por ese fallback.
    let cuota = (ganador.cuotaSnapshot ?? null) as {
      entidad: "EMPLEADO" | "EMPRESA";
      campo: string;
      valor: string;
    } | null;
    if (!cuota && !ganador.ejecucion.esAdicional) {
      const empleadoGanador = ganador.participante.empleado;
      const pseudoCandidato = {
        id: "",
        empleadoId: "",
        empleado: {
          codigo: empleadoGanador.codigo,
          departamento: empleadoGanador.departamento,
          clasificacion: empleadoGanador.clasificacion,
          zona: empleadoGanador.zona,
          puesto: empleadoGanador.puesto,
          empresa: {
            codigo: empleadoGanador.empresa.codigo,
            clasificacion: empleadoGanador.empresa.clasificacion,
            ubicacion: empleadoGanador.empresa.ubicacion,
          },
        },
      };
      const coinciden = sorteo.cuotas.filter(
        (c) => c.activo && candidatoCumpleCuota(pseudoCandidato, c),
      );
      if (coinciden.length === 1) {
        cuota = {
          entidad: coinciden[0].entidad,
          campo: coinciden[0].campo,
          valor: coinciden[0].valor,
        };
      }
    }

    const pool = cuota
      ? candidatos.filter((c) => candidatoCumpleCuota(c, cuota))
      : candidatos;
    if (pool.length === 0) {
      throw new ConflictError(
        cuota
          ? `No hay candidatos elegibles que cumplan la cuota ${cuota.campo} = "${cuota.valor}" para el reemplazo`
          : "No hay candidatos elegibles disponibles para el reemplazo",
      );
    }

    const reemplazo = pool[randomInt(pool.length)];

    const motivoFinal = motivo?.trim() || "No presente";
    const [, nuevo] = await tx.$transaction([
      tx.sorteoGanador.update({
        where: { id: ganador.id },
        data: {
          estado: "AUSENTE",
          motivoAusencia: motivoFinal,
          reemplazadoAt: new Date(),
          reemplazadoPor: actor ?? null,
        },
      }),
      tx.sorteoGanador.create({
        data: {
          ejecucionId: ganador.ejecucionId,
          eventoId: sorteo.eventoId,
          empleadoId: reemplazo.empleadoId,
          posicion: ganador.posicion,
          cuotaSnapshot: ganador.cuotaSnapshot ?? undefined,
          reemplazaAGanadorId: ganador.id,
        },
      }),
    ]);

    await registrarAuditoria(
      {
        eventoId: sorteo.eventoId,
        entidad: "SorteoGanador",
        entidadId: ganador.id,
        accion: "REEMPLAZAR_GANADOR",
        actor,
        antes: {
          empleadoId: ganador.empleadoId,
          codigo: ganador.participante.empleado.codigo,
          posicion: ganador.posicion,
        },
        despues: {
          estado: "AUSENTE",
          motivo: motivoFinal,
          reemplazoEmpleadoId: reemplazo.empleadoId,
          reemplazoCodigo: reemplazo.empleado.codigo,
          reemplazoGanadorId: nuevo.id,
        },
      },
      tx,
    );

    return {
      ganadorAusenteId: ganador.id,
      ganadorReemplazoId: nuevo.id,
      posicion: nuevo.posicion,
      reemplazo: {
        empleadoId: reemplazo.empleadoId,
        codigo: reemplazo.empleado.codigo,
        nombre: `${reemplazo.empleado.nombres} ${reemplazo.empleado.apellidos}`,
        empresa: reemplazo.empleado.empresa.nombre,
        empresaCodigo: reemplazo.empleado.empresa.codigo,
        puesto: reemplazo.empleado.puesto,
        departamento: reemplazo.empleado.departamento,
      },
    };
  });
}

export type AgregarAdicionalesInput = {
  cantidad: number;
  motivo: string | null;
  cuota: {
    entidad: "EMPLEADO" | "EMPRESA";
    campo: string;
    valor: string;
  } | null;
  permitirParcial?: boolean;
};

export type AdicionalesResultado = {
  ejecucionId: string;
  posicionBase: number;
  parcial?: boolean;
  vacantes?: number;
  ganadores: {
    id: string;
    posicion: number;
    empleadoId: string;
    codigo: string;
    nombre: string;
    empresa: string;
    empresaCodigo: string;
    puesto: string | null;
    departamento: string | null;
  }[];
};

const candidatoSelect = {
  id: true,
  empleadoId: true,
  empleado: {
    select: {
      codigo: true,
      nombres: true,
      apellidos: true,
      departamento: true,
      clasificacion: true,
      zona: true,
      puesto: true,
      empresa: {
        select: {
          codigo: true,
          nombre: true,
          clasificacion: true,
          ubicacion: true,
        },
      },
    },
  },
} as const;

/**
 * Sortea ganadores adicionales sobre un sorteo FINALIZADO sin alterar su
 * configuración ni el acta de la ejecución inicial. Crea una nueva
 * SorteoEjecucion (esAdicional) con posiciones consecutivas, aplicando
 * asistencia obligatoria y reglas activas; las cuotas del sorteo no se
 * vuelven a aplicar salvo que el operador indique una cuota específica.
 */
export async function agregarGanadoresAdicionales(
  eventoId: string,
  sorteoId: string,
  input: AgregarAdicionalesInput,
  actor?: string | null,
): Promise<AdicionalesResultado> {
  const sorteo = await sorteoRepository.findById(sorteoId);
  if (!sorteo || sorteo.eventoId !== eventoId) {
    throw new NotFoundError("Sorteo no encontrado");
  }
  if (sorteo.estado !== "FINALIZADO") {
    throw new ValidationError(
      "Solo se pueden agregar ganadores a un sorteo FINALIZADO",
    );
  }

  const resultado = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventoId}))`;

    const completada = await tx.sorteoEjecucion.findFirst({
      where: { sorteoId, estado: { in: ["COMPLETADA", "PARCIAL"] } },
      select: { id: true },
    });
    if (!completada) {
      throw new ConflictError(
        "El sorteo aún no tiene una ejecución completada",
      );
    }

    const maxPos = await tx.sorteoGanador.aggregate({
      where: { ejecucion: { sorteoId } },
      _max: { posicion: true },
    });
    const posicionBase = maxPos._max.posicion ?? 0;

    const previos = await tx.sorteoGanador.findMany({
      where: { eventoId },
      select: { empleadoId: true },
    });
    const where = elegiblesWhere(
      sorteo,
      previos.map((g) => g.empleadoId),
    );
    const candidatos = await tx.eventoParticipante.findMany({
      where,
      select: candidatoSelect,
    });

    const reglasActivas = sorteo.reglas.filter((r) => r.activo);
    const cuotasAplicadas = input.cuota
      ? [{ ...input.cuota, cantidad: input.cantidad, orden: 0 }]
      : [];
    const reglasSnapshot = [
      ...reglasActivas.map((r) => ({
        tipo: "REGLA" as const,
        entidad: r.entidad,
        campo: r.campo,
        operador: r.operador,
        valor: r.valor,
        orden: r.orden,
      })),
      ...cuotasAplicadas.map((c) => ({
        tipo: "CUOTA" as const,
        entidad: c.entidad,
        campo: c.campo,
        valor: c.valor,
        cantidad: c.cantidad,
        orden: c.orden,
      })),
    ];
    const base = {
      sorteoId,
      eventoId,
      cantidadSolicitada: input.cantidad,
      totalCandidatos: candidatos.length,
      reglasSnapshot,
      candidatosSnapshot: candidatos.map((c) => c.id),
      ejecutadoPor: actor ?? null,
      esAdicional: true,
      motivo: input.motivo,
    };

    const seleccion = seleccionarCandidatosConCuotas(
      candidatos,
      input.cantidad,
      cuotasAplicadas,
      { permitirParcial: input.permitirParcial },
    );
    if (!seleccion.ok) {
      const fallida = await tx.sorteoEjecucion.create({
        data: { ...base, estado: "FALLIDA", error: seleccion.error },
      });
      await registrarAuditoria(
        {
          eventoId,
          entidad: "SorteoEjecucion",
          entidadId: fallida.id,
          accion: "EJECUCION_ADICIONAL_FALLIDA",
          actor,
          despues: {
            sorteoId,
            error: seleccion.error,
            cantidadSolicitada: input.cantidad,
          },
        },
        tx,
      );
      return {
        ok: false as const,
        ejecucionId: fallida.id,
        error: seleccion.error,
      };
    }

    const ejecucion = await tx.sorteoEjecucion.create({
      data: {
        ...base,
        estado: seleccion.parcial ? "PARCIAL" : "COMPLETADA",
        error: seleccion.parcial
          ? seleccion.faltantesDetalle.join("; ")
          : null,
      },
    });

    const ganadores: AdicionalesResultado["ganadores"] = [];
    for (const [idx, c] of seleccion.seleccionados.entries()) {
      const nuevo = await tx.sorteoGanador.create({
        data: {
          ejecucionId: ejecucion.id,
          eventoId,
          empleadoId: c.empleadoId,
          posicion: posicionBase + idx + 1,
          cuotaSnapshot: seleccion.cuotasAsignadas[idx] ?? undefined,
        },
      });
      ganadores.push({
        id: nuevo.id,
        posicion: nuevo.posicion,
        empleadoId: c.empleadoId,
        codigo: c.empleado.codigo,
        nombre: `${c.empleado.nombres} ${c.empleado.apellidos}`,
        empresa: c.empleado.empresa.nombre ?? "",
        empresaCodigo: c.empleado.empresa.codigo,
        puesto: c.empleado.puesto,
        departamento: c.empleado.departamento,
      });
    }

    await registrarAuditoria(
      {
        eventoId,
        entidad: "SorteoEjecucion",
        entidadId: ejecucion.id,
        accion: "AGREGAR_GANADORES_ADICIONALES",
        actor,
        despues: {
          sorteoId,
          cantidad: input.cantidad,
          adjudicados: ganadores.length,
          parcial: seleccion.parcial,
          vacantes: seleccion.vacantes,
          posicionBase,
          cuota: input.cuota,
          ganadores: ganadores.map((g) => g.empleadoId),
        },
      },
      tx,
    );

    return {
      ok: true as const,
      ejecucionId: ejecucion.id,
      posicionBase,
      parcial: seleccion.parcial,
      vacantes: seleccion.vacantes,
      ganadores,
    };
  });

  if (!resultado.ok) {
    throw new ConflictError(resultado.error, {
      ejecucionId: resultado.ejecucionId,
    });
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
        orderBy: [{ posicion: "asc" }, { createdAt: "asc" }],
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
          reemplazaA: {
            include: {
              participante: {
                include: {
                  empleado: {
                    select: { codigo: true, nombres: true, apellidos: true },
                  },
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
    orderBy: [{ createdAt: "asc" }, { posicion: "asc" }],
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
      reemplazaA: {
        include: {
          participante: {
            include: {
              empleado: {
                select: { codigo: true, nombres: true, apellidos: true },
              },
            },
          },
        },
      },
      reemplazadoCon: {
        include: {
          participante: {
            include: {
              empleado: {
                select: { codigo: true, nombres: true, apellidos: true },
              },
            },
          },
        },
      },
    },
  });
}
