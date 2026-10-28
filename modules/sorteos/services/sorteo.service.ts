import type { Prisma, SorteoRegla } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { isRecordNotFound } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/modules/auditoria/lib/audit";
import { eventoRepository } from "@/modules/eventos/repositories/evento.repository";
import { getCampoDef } from "@/modules/sorteos/lib/reglas-catalogo";
import {
  reglaSchema,
  reglaUpdateSchema,
  sorteoCreateSchema,
  sorteoUpdateSchema,
  type SorteoListQuery,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
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

export async function listarElegibles(sorteoId: string, take = 50) {
  const sorteo = await assertSorteo(sorteoId);
  const excluidos = await listGanadorEmpleadoIds(sorteo.eventoId);
  const where = elegiblesWhere(sorteo, excluidos);

  const [data, total] = await Promise.all([
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
  ]);

  return {
    total,
    data,
    reglasAplicadas: sorteo.reglas.filter((r) => r.activo).length,
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
