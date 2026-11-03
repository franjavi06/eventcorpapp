import { randomInt } from "node:crypto";
import ExcelJS from "exceljs";

import type { Prisma, SorteoCuota, SorteoRegla } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/modules/auditoria/lib/audit";
import { eventoRepository } from "@/modules/eventos/repositories/evento.repository";
import { getCampoDef } from "@/modules/sorteos/lib/reglas-catalogo";
import {
  cuotaSchema,
  cuotaUpdateSchema,
  reglaSchema,
  reglaUpdateSchema,
  sorteoCargaMasivaSchema,
  sorteoCreateSchema,
  sorteoUpdateSchema,
  type SorteoListQuery,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
  cuotaRepository,
  reglaRepository,
  sorteoRepository,
} from "@/modules/sorteos/repositories/sorteo.repository";

async function assertEvento(eventoId: string) {
  const evento = await eventoRepository.findById(eventoId);
  if (!evento) throw new NotFoundError("Evento no encontrado");
  return evento;
}

async function assertSorteo(sorteoId: string) {
  const sorteo = await sorteoRepository.findById(sorteoId);
  if (!sorteo) throw new NotFoundError("Sorteo no encontrado");
  return sorteo;
}

/**
 * Tras una ejecución COMPLETADA el sorteo y sus reglas quedan en solo lectura:
 * los resultados fueron calculados con esa configuración.
 */
async function assertSorteoEditable(sorteoId: string) {
  const completada = await prisma.sorteoEjecucion.findFirst({
    where: { sorteoId, estado: "COMPLETADA" },
    select: { id: true },
  });
  if (completada) {
    throw new ConflictError(
      "No se puede modificar: el sorteo ya tiene una ejecución completada",
    );
  }
}

export async function listSorteos(eventoId: string, query: SorteoListQuery) {
  await assertEvento(eventoId);
  const { page, pageSize, q, estado } = query;

  const where: Prisma.SorteoWhereInput = {
    eventoId,
    ...(estado !== "all" && { estado }),
    ...(q && {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { descripcion: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    sorteoRepository.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    sorteoRepository.count(where),
  ]);

  return { data, total, page, pageSize };
}

export async function getSorteo(id: string) {
  return assertSorteo(id);
}

export async function createSorteo(eventoId: string, input: unknown) {
  const data = sorteoCreateSchema.parse(input);
  await assertEvento(eventoId);
  const sorteo = await sorteoRepository.create({ ...data, eventoId });
  await registrarAuditoria({
    eventoId,
    entidad: "Sorteo",
    entidadId: sorteo.id,
    accion: "CREAR",
    despues: {
      nombre: sorteo.nombre,
      cantidadGanadores: sorteo.cantidadGanadores,
      asistenciaObligatoria: sorteo.asistenciaObligatoria,
      estado: sorteo.estado,
    },
  });
  return sorteo;
}

export async function updateSorteo(id: string, input: unknown) {
  const data = sorteoUpdateSchema.parse(input);
  await assertSorteoEditable(id);
  try {
    const antes = await sorteoRepository.findById(id);
    const sorteo = await sorteoRepository.update(id, data);
    await registrarAuditoria({
      eventoId: sorteo.eventoId,
      entidad: "Sorteo",
      entidadId: id,
      accion: "ACTUALIZAR",
      antes: antes
        ? {
            nombre: antes.nombre,
            estado: antes.estado,
            cantidadGanadores: antes.cantidadGanadores,
            asistenciaObligatoria: antes.asistenciaObligatoria,
          }
        : null,
      despues: {
        nombre: sorteo.nombre,
        estado: sorteo.estado,
        cantidadGanadores: sorteo.cantidadGanadores,
        asistenciaObligatoria: sorteo.asistenciaObligatoria,
      },
    });
    return sorteo;
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError("Sorteo no encontrado");
    throw error;
  }
}

export async function deleteSorteo(id: string) {
  await assertSorteoEditable(id);
  try {
    const sorteo = await sorteoRepository.findById(id);
    await sorteoRepository.remove(id);
    await registrarAuditoria({
      eventoId: sorteo?.eventoId,
      entidad: "Sorteo",
      entidadId: id,
      accion: "ELIMINAR",
      antes: sorteo ? { nombre: sorteo.nombre, estado: sorteo.estado } : null,
    });
    return { removed: true };
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError("Sorteo no encontrado");
    throw error;
  }
}

export async function addRegla(sorteoId: string, input: unknown) {
  const data = reglaSchema.parse(input);
  const sorteo = await assertSorteo(sorteoId);
  await assertSorteoEditable(sorteoId);
  const regla = await reglaRepository.create({ ...data, sorteoId });
  await registrarAuditoria({
    eventoId: sorteo.eventoId,
    entidad: "SorteoRegla",
    entidadId: regla.id,
    accion: "AGREGAR_REGLA",
    despues: {
      sorteoId,
      entidad: regla.entidad,
      campo: regla.campo,
      operador: regla.operador,
      valor: regla.valor,
    },
  });
  return regla;
}

export async function updateRegla(reglaId: string, input: unknown) {
  const data = reglaUpdateSchema.parse(input);
  const actual = await reglaRepository.findById(reglaId);
  if (!actual) throw new NotFoundError("Regla no encontrada");
  await assertSorteoEditable(actual.sorteoId);

  // La regla resultante (mezcla actual + cambios) debe seguir siendo válida
  const merged = reglaSchema.parse({ ...actual, ...data });
  const regla = await reglaRepository.update(reglaId, merged);
  const sorteo = await assertSorteo(actual.sorteoId);
  await registrarAuditoria({
    eventoId: sorteo.eventoId,
    entidad: "SorteoRegla",
    entidadId: regla.id,
    accion: "ACTUALIZAR_REGLA",
    antes: {
      campo: actual.campo,
      operador: actual.operador,
      valor: actual.valor,
      activo: actual.activo,
    },
    despues: {
      campo: regla.campo,
      operador: regla.operador,
      valor: regla.valor,
      activo: regla.activo,
    },
  });
  return regla;
}

export async function removeRegla(reglaId: string) {
  const actual = await reglaRepository.findById(reglaId);
  if (actual) await assertSorteoEditable(actual.sorteoId);
  try {
    await reglaRepository.remove(reglaId);
    if (actual) {
      const sorteo = await assertSorteo(actual.sorteoId);
      await registrarAuditoria({
        eventoId: sorteo.eventoId,
        entidad: "SorteoRegla",
        entidadId: reglaId,
        accion: "ELIMINAR_REGLA",
        antes: {
          campo: actual.campo,
          operador: actual.operador,
          valor: actual.valor,
        },
      });
    }
    return { removed: true };
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError("Regla no encontrada");
    throw error;
  }
}

async function syncCantidadGanadoresConCuotas(sorteoId: string) {
  const cuotasActivas = await prisma.sorteoCuota.findMany({
    where: { sorteoId, activo: true },
    select: { cantidad: true },
  });
  if (cuotasActivas.length === 0) return;
  const totalCuotas = cuotasActivas.reduce((acc, c) => acc + c.cantidad, 0);
  if (totalCuotas > 0) {
    await prisma.sorteo.update({
      where: { id: sorteoId },
      data: { cantidadGanadores: totalCuotas },
    });
  }
}

export async function addCuota(sorteoId: string, rawInput: unknown) {
  const sorteo = await assertSorteo(sorteoId);
  await assertSorteoEditable(sorteoId);
  const input = cuotaSchema.parse(rawInput);
  try {
    const cuota = await cuotaRepository.create({ sorteoId, ...input });
    await syncCantidadGanadoresConCuotas(sorteoId);
    await registrarAuditoria({
      eventoId: sorteo.eventoId,
      entidad: "SorteoCuota",
      entidadId: cuota.id,
      accion: "CREAR_CUOTA",
      despues: {
        sorteoId,
        entidad: cuota.entidad,
        campo: cuota.campo,
        valor: cuota.valor,
        cantidad: cuota.cantidad,
      },
    });
    return cuota;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        "Ya existe una cuota para ese campo y valor en este sorteo",
      );
    }
    throw error;
  }
}

export async function updateCuota(cuotaId: string, rawInput: unknown) {
  const actual = await cuotaRepository.findById(cuotaId);
  if (!actual) throw new NotFoundError("Cuota no encontrada");
  await assertSorteoEditable(actual.sorteoId);

  const partial = cuotaUpdateSchema.parse(rawInput);
  const merged = cuotaSchema.parse({
    entidad: partial.entidad ?? actual.entidad,
    campo: partial.campo ?? actual.campo,
    valor: partial.valor ?? actual.valor,
    cantidad: partial.cantidad ?? actual.cantidad,
    orden: partial.orden ?? actual.orden,
    activo: partial.activo ?? actual.activo,
  });

  try {
    const cuota = await cuotaRepository.update(cuotaId, merged);
    await syncCantidadGanadoresConCuotas(actual.sorteoId);
    const sorteo = await assertSorteo(actual.sorteoId);
    await registrarAuditoria({
      eventoId: sorteo.eventoId,
      entidad: "SorteoCuota",
      entidadId: cuota.id,
      accion: "ACTUALIZAR_CUOTA",
      antes: {
        campo: actual.campo,
        valor: actual.valor,
        cantidad: actual.cantidad,
        activo: actual.activo,
      },
      despues: {
        campo: cuota.campo,
        valor: cuota.valor,
        cantidad: cuota.cantidad,
        activo: cuota.activo,
      },
    });
    return cuota;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        "Ya existe una cuota para ese campo y valor en este sorteo",
      );
    }
    throw error;
  }
}

export async function removeCuota(cuotaId: string) {
  const actual = await cuotaRepository.findById(cuotaId);
  if (actual) await assertSorteoEditable(actual.sorteoId);
  try {
    await cuotaRepository.remove(cuotaId);
    if (actual) {
      await syncCantidadGanadoresConCuotas(actual.sorteoId);
      const sorteo = await assertSorteo(actual.sorteoId);
      await registrarAuditoria({
        eventoId: sorteo.eventoId,
        entidad: "SorteoCuota",
        entidadId: cuotaId,
        accion: "ELIMINAR_CUOTA",
        antes: {
          campo: actual.campo,
          valor: actual.valor,
          cantidad: actual.cantidad,
        },
      });
    }
    return { removed: true };
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError("Cuota no encontrada");
    throw error;
  }
}

/**
 * Traduce una regla a un fragmento de consulta Prisma sobre el participante.
 * Mapeo declarativo: solo campos del catálogo, nunca nombres del cliente.
 */
export function reglaToWhere(
  regla: Pick<SorteoRegla, "entidad" | "campo" | "operador" | "valor">,
): Prisma.EventoParticipanteWhereInput {
  const def = getCampoDef(regla.entidad, regla.campo);
  if (!def) {
    throw new ValidationError(
      `Campo no permitido: ${regla.entidad}.${regla.campo}`,
    );
  }

  let condition: Record<string, unknown>;
  if (def.tipo === "booleano") {
    condition = { [regla.campo]: { equals: regla.valor === "true" } };
  } else if (def.tipo === "meses") {
    const meses = Number(regla.valor);
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - meses);
    const op =
      regla.operador === "DESPUES_DE" ? { lte: cutoff } : { gt: cutoff };
    condition = { fechaIngreso: op };
  } else if (def.tipo === "fecha") {
    const date = new Date(regla.valor);
    const op =
      regla.operador === "ANTES_DE"
        ? { lt: date }
        : regla.operador === "DESPUES_DE"
          ? { gt: date }
          : { equals: date };
    condition = { [regla.campo]: op };
  } else {
    const op =
      regla.operador === "DISTINTO"
        ? { not: regla.valor }
        : regla.operador === "CONTIENE"
          ? { contains: regla.valor, mode: "insensitive" }
          : { equals: regla.valor, mode: "insensitive" };
    condition = { [regla.campo]: op };
  }

  return regla.entidad === "EMPRESA"
    ? { empleado: { empresa: condition } }
    : { empleado: condition };
}

/**
 * Where de elegibilidad efectiva: participaSorteos + empleado/empresa activos
 * + asistencia si es obligatoria + AND de reglas activas + exclusión de
 * ganadores previos del mismo evento (Etapa 6).
 * Reutilizado por `listarElegibles` (preview) y `ejecutarSorteo` (transacción).
 */
export function elegiblesWhere(
  sorteo: {
    eventoId: string;
    asistenciaObligatoria: boolean;
    reglas: Pick<SorteoRegla, "entidad" | "campo" | "operador" | "valor" | "activo">[];
  },
  excluirEmpleadoIds: string[] = [],
): Prisma.EventoParticipanteWhereInput {
  const where: Prisma.EventoParticipanteWhereInput = {
    eventoId: sorteo.eventoId,
    participaSorteos: true,
    empleado: { activo: true, empresa: { activo: true } },
    ...(sorteo.asistenciaObligatoria && { asistencia: { isNot: null } }),
    ...(excluirEmpleadoIds.length > 0 && {
      empleadoId: { notIn: excluirEmpleadoIds },
    }),
  };

  const reglasActivas = sorteo.reglas.filter((r) => r.activo);
  if (reglasActivas.length > 0) {
    where.AND = reglasActivas.map(reglaToWhere);
  }
  return where;
}

/** IDs de empleados que ya ganaron algún sorteo del evento. */
export async function listGanadorEmpleadoIds(eventoId: string) {
  const rows = await prisma.sorteoGanador.findMany({
    where: { eventoId },
    select: { empleadoId: true },
  });
  return rows.map((r) => r.empleadoId);
}

export type CandidatoParaCuota = {
  id: string;
  empleadoId: string;
  empleado: {
    codigo: string;
    departamento: string | null;
    clasificacion: string | null;
    zona: string | null;
    puesto: string | null;
    empresa: {
      codigo: string;
      clasificacion?: string | null;
      ubicacion?: string | null;
    };
  };
};

export function candidatoCumpleCuota(
  candidato: CandidatoParaCuota,
  cuota: Pick<SorteoCuota, "entidad" | "campo" | "valor">,
): boolean {
  const esperado = cuota.valor.trim().toLowerCase();
  let actual: string | null | undefined;
  if (cuota.entidad === "EMPRESA") {
    const emp = candidato.empleado.empresa;
    if (cuota.campo === "codigo") actual = emp.codigo;
    else if (cuota.campo === "clasificacion") actual = emp.clasificacion;
    else if (cuota.campo === "ubicacion") actual = emp.ubicacion;
  } else {
    const e = candidato.empleado;
    if (cuota.campo === "departamento") actual = e.departamento;
    else if (cuota.campo === "clasificacion") actual = e.clasificacion;
    else if (cuota.campo === "zona") actual = e.zona;
    else if (cuota.campo === "puesto") actual = e.puesto;
    else if (cuota.campo === "codigo") actual = e.codigo;
  }
  return (actual?.trim().toLowerCase() ?? "") === esperado;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Selecciona `cantidadTotal` candidatos respetando las cuotas activas.
 * Si no hay cuotas activas, selecciona al azar de todo el pool.
 * Si hay cuotas activas, extrae `cuota.cantidad` de cada grupo y el remanente
 * (si `cantidadTotal > sumaCuotas`) del resto de candidatos no seleccionados.
 */
export function seleccionarCandidatosConCuotas<T extends CandidatoParaCuota>(
  candidatos: T[],
  cantidadTotal: number,
  cuotasActivas: Pick<SorteoCuota, "entidad" | "campo" | "valor" | "cantidad">[],
): { ok: true; seleccionados: T[] } | { ok: false; error: string } {
  if (cuotasActivas.length === 0) {
    if (candidatos.length < cantidadTotal) {
      return {
        ok: false,
        error: `Candidatos insuficientes: se requieren ${cantidadTotal} y hay ${candidatos.length}`,
      };
    }
    const copia = shuffleInPlace([...candidatos]);
    return { ok: true, seleccionados: copia.slice(0, cantidadTotal) };
  }

  const sumaCuotas = cuotasActivas.reduce((acc, c) => acc + c.cantidad, 0);
  if (sumaCuotas > cantidadTotal) {
    return {
      ok: false,
      error: `La suma de cuotas (${sumaCuotas}) supera la cantidad total de ganadores del sorteo (${cantidadTotal})`,
    };
  }

  const usados = new Set<string>();
  const seleccionados: T[] = [];

  for (const cuota of cuotasActivas) {
    const def = getCampoDef(cuota.entidad, cuota.campo);
    const labelCampo = def?.label ?? cuota.campo;
    const disponibles = candidatos.filter(
      (c) => !usados.has(c.empleadoId) && candidatoCumpleCuota(c, cuota),
    );
    if (disponibles.length < cuota.cantidad) {
      return {
        ok: false,
        error: `Candidatos insuficientes para la cuota ${labelCampo} = "${cuota.valor}": se requieren ${cuota.cantidad} y hay ${disponibles.length} disponible(s)`,
      };
    }
    const barajados = shuffleInPlace([...disponibles]);
    const elegidosGrupo = barajados.slice(0, cuota.cantidad);
    for (const c of elegidosGrupo) {
      usados.add(c.empleadoId);
      seleccionados.push(c);
    }
  }

  const faltantes = cantidadTotal - seleccionados.length;
  if (faltantes > 0) {
    const resto = candidatos.filter((c) => !usados.has(c.empleadoId));
    if (resto.length < faltantes) {
      return {
        ok: false,
        error: `Candidatos insuficientes para completar los ${faltantes} cupos libres restantes: solo quedan ${resto.length}`,
      };
    }
    const barajadosResto = shuffleInPlace([...resto]);
    seleccionados.push(...barajadosResto.slice(0, faltantes));
  }

  return { ok: true, seleccionados };
}

export async function listarElegibles(sorteoId: string, take = 50) {
  const sorteo = await assertSorteo(sorteoId);
  const excluidos = await listGanadorEmpleadoIds(sorteo.eventoId);
  const where = elegiblesWhere(sorteo, excluidos);

  const [data, total, todosParaCuotas] = await Promise.all([
    prisma.eventoParticipante.findMany({
      where,
      take,
      orderBy: [
        { empleado: { apellidos: "asc" } },
        { empleado: { nombres: "asc" } },
      ],
      include: {
        empleado: {
          select: {
            id: true,
            codigo: true,
            nombres: true,
            apellidos: true,
            puesto: true,
            departamento: true,
            clasificacion: true,
            zona: true,
            fechaIngreso: true,
            empresa: { select: { codigo: true, nombre: true } },
          },
        },
        asistencia: { select: { registradoAt: true } },
      },
    }),
    prisma.eventoParticipante.count({ where }),
    sorteo.cuotas.some((c) => c.activo)
      ? prisma.eventoParticipante.findMany({
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
        })
      : Promise.resolve([]),
  ]);

  const cuotasActivas = sorteo.cuotas.filter((c) => c.activo);
  const cuotasResumen = cuotasActivas.map((c) => ({
    id: c.id,
    entidad: c.entidad,
    campo: c.campo,
    valor: c.valor,
    requeridos: c.cantidad,
    disponibles: todosParaCuotas.filter((cand) => candidatoCumpleCuota(cand, c))
      .length,
  }));

  return {
    total,
    data,
    reglasAplicadas: sorteo.reglas.filter((r) => r.activo).length,
    cuotasResumen,
  };
}

export async function simularSorteo(sorteoId: string) {
  const sorteo = await assertSorteo(sorteoId);
  const excluidos = await listGanadorEmpleadoIds(sorteo.eventoId);
  const where = elegiblesWhere(sorteo, excluidos);

  const candidatos = await prisma.eventoParticipante.findMany({
    where,
    include: {
      empleado: {
        select: {
          id: true,
          codigo: true,
          nombres: true,
          apellidos: true,
          puesto: true,
          departamento: true,
          clasificacion: true,
          zona: true,
          fechaIngreso: true,
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
      asistencia: { select: { registradoAt: true } },
    },
  });

  const cuotasActivas = sorteo.cuotas.filter((c) => c.activo);
  const resultado = seleccionarCandidatosConCuotas(
    candidatos,
    sorteo.cantidadGanadores,
    cuotasActivas,
  );
  if (!resultado.ok) {
    throw new ValidationError(resultado.error);
  }

  return {
    totalElegibles: candidatos.length,
    cantidadGanadores: sorteo.cantidadGanadores,
    reglasAplicadas: sorteo.reglas.filter((r) => r.activo).length,
    cuotasAplicadas: cuotasActivas.length,
    ganadoresSimulados: resultado.seleccionados.map((c, idx) => ({
      orden: idx + 1,
      id: c.id,
      empleado: c.empleado,
      asistencia: c.asistencia,
    })),
  };
}

export type ValoresSugeridosEvento = {
  departamentos: string[];
  clasificaciones: string[];
  zonas: string[];
  puestos: string[];
  empresasCodigos: string[];
};

export async function getValoresSugeridosEvento(
  eventoId: string,
): Promise<ValoresSugeridosEvento> {
  const [empleados, eventoEmpresas] = await Promise.all([
    prisma.empleado.findMany({
      where: {
        activo: true,
        empresa: { activo: true, eventos: { some: { eventoId } } },
      },
      select: {
        departamento: true,
        clasificacion: true,
        zona: true,
        puesto: true,
      },
    }),
    prisma.eventoEmpresa.findMany({
      where: { eventoId },
      select: { empresa: { select: { codigo: true } } },
    }),
  ]);

  const uniqSorted = (vals: (string | null | undefined)[]) =>
    Array.from(
      new Set(
        vals
          .map((v) => v?.trim())
          .filter((v): v is string => Boolean(v && v.length > 0)),
      ),
    ).sort((a, b) => a.localeCompare(b, "es"));

  return {
    departamentos: uniqSorted(empleados.map((e) => e.departamento)),
    clasificaciones: uniqSorted(empleados.map((e) => e.clasificacion)),
    zonas: uniqSorted(empleados.map((e) => e.zona)),
    puestos: uniqSorted(empleados.map((e) => e.puesto)),
    empresasCodigos: uniqSorted(eventoEmpresas.map((ee) => ee.empresa.codigo)),
  };
}

export async function createSorteosBulk(eventoId: string, rawInput: unknown) {
  await assertEvento(eventoId);
  const input = sorteoCargaMasivaSchema.parse(rawInput);

  const ultimo = await prisma.sorteo.findFirst({
    where: { eventoId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  let siguienteOrden = (ultimo?.orden ?? 0) + 1;

  const creados = await prisma.$transaction(async (tx) => {
    const lista = [];
    for (const item of input.items) {
      const sorteo = await tx.sorteo.create({
        data: {
          eventoId,
          nombre: item.nombre,
          descripcion: item.descripcion ?? null,
          cantidadGanadores: item.cantidadGanadores,
          orden: siguienteOrden++,
          estado: input.estado,
          asistenciaObligatoria: input.asistenciaObligatoria,
          ...(input.antiguedadMinimaMeses
            ? {
                reglas: {
                  create: {
                    entidad: "EMPLEADO",
                    campo: "antiguedadMeses",
                    operador: "DESPUES_DE",
                    valor: String(input.antiguedadMinimaMeses),
                    orden: 0,
                    activo: true,
                  },
                },
              }
            : {}),
        },
      });
      lista.push(sorteo);
    }

    await registrarAuditoria(
      {
        eventoId,
        entidad: "Sorteo",
        accion: "CARGA_MASIVA_SORTEOS",
        despues: {
          creados: lista.length,
          estado: input.estado,
          antiguedadMinimaMeses: input.antiguedadMinimaMeses,
          nombres: lista.map((s) => s.nombre),
        },
      },
      tx,
    );

    return lista;
  });

  return {
    creados: creados.length,
    data: creados,
  };
}

function cellToText(val: ExcelJS.CellValue): string {
  if (val == null) return "";
  if (typeof val === "object" && "text" in val && typeof val.text === "string") {
    return val.text.trim();
  }
  if (
    typeof val === "object" &&
    "result" in val &&
    val.result !== undefined &&
    val.result !== null
  ) {
    return String(val.result).trim();
  }
  return String(val).trim();
}

export async function parseSorteosExcel(
  buffer: ArrayBuffer,
): Promise<{ nombre: string; cantidadGanadores: number; descripcion?: string | null }[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) {
    throw new ValidationError("El archivo Excel no contiene hojas");
  }

  const headerRow = sheet.getRow(1);
  const colMap = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const key = cellToText(cell.value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (key) colMap.set(key, colNumber);
  });

  const colNombre =
    colMap.get("nombre") ??
    colMap.get("sorteo") ??
    colMap.get("premio") ??
    colMap.get("premios") ??
    1;
  const colCantidad =
    colMap.get("cantidad_ganadores") ??
    colMap.get("cantidad") ??
    colMap.get("ganadores") ??
    2;
  const colDescripcion = colMap.get("descripcion") ?? 3;

  const items: {
    nombre: string;
    cantidadGanadores: number;
    descripcion?: string | null;
  }[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const nombre = cellToText(row.getCell(colNombre).value);
    const cantRaw = cellToText(row.getCell(colCantidad).value);
    const descripcion = cellToText(row.getCell(colDescripcion).value);
    if (!nombre && !cantRaw) return;
    const cantidadGanadores = Number(cantRaw.replace(/,/g, ""));
    if (!nombre || !Number.isInteger(cantidadGanadores) || cantidadGanadores < 1) {
      throw new ValidationError(
        `Fila ${rowNumber}: ingrese un nombre válido y una cantidad entera mayor que 0`,
      );
    }
    items.push({
      nombre,
      cantidadGanadores,
      descripcion: descripcion || null,
    });
  });

  if (items.length === 0) {
    throw new ValidationError(
      "El archivo no contiene filas de sorteos válidas",
    );
  }
  return items;
}

export async function buildSorteosPlantillaExcel(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sorteos");
  ws.columns = [
    { header: "nombre", key: "nombre", width: 34 },
    { header: "cantidad_ganadores", key: "cantidad_ganadores", width: 22 },
    { header: "descripcion", key: "descripcion", width: 38 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow({
    nombre: "Premio $2,500",
    cantidad_ganadores: 20,
    descripcion: "4 Administración, 10 Operaciones, 6 Comercial",
  });
  ws.addRow({
    nombre: "Premio $3,000",
    cantidad_ganadores: 16,
    descripcion: "10 Operaciones, 6 Comercial",
  });
  ws.addRow({
    nombre: "Gran Premio $20,000",
    cantidad_ganadores: 3,
    descripcion: "Premio general",
  });
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
