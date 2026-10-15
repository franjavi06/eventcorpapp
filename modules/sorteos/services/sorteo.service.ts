import type { Prisma, SorteoRegla } from "@/generated/prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { isRecordNotFound } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
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
  return sorteoRepository.create({ ...data, eventoId });
}

export async function updateSorteo(id: string, input: unknown) {
  const data = sorteoUpdateSchema.parse(input);
  try {
    return await sorteoRepository.update(id, data);
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError("Sorteo no encontrado");
    throw error;
  }
}

export async function deleteSorteo(id: string) {
  try {
    await sorteoRepository.remove(id);
    return { removed: true };
  } catch (error) {
    if (isRecordNotFound(error)) throw new NotFoundError("Sorteo no encontrado");
    throw error;
  }
}

export async function addRegla(sorteoId: string, input: unknown) {
  const data = reglaSchema.parse(input);
  await assertSorteo(sorteoId);
  return reglaRepository.create({ ...data, sorteoId });
}

export async function updateRegla(reglaId: string, input: unknown) {
  const data = reglaUpdateSchema.parse(input);
  const actual = await reglaRepository.findById(reglaId);
  if (!actual) throw new NotFoundError("Regla no encontrada");

  // La regla resultante (mezcla actual + cambios) debe seguir siendo válida
  const merged = reglaSchema.parse({ ...actual, ...data });
  return reglaRepository.update(reglaId, merged);
}

export async function removeRegla(reglaId: string) {
  try {
    await reglaRepository.remove(reglaId);
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
 * Elegibilidad efectiva (Etapa 5): participaSorteos + empleado/empresa activos
 * + asistencia si es obligatoria + todas las reglas activas (AND).
 * La exclusión de ganadores previos del mismo evento se añade en Etapa 6.
 */
export async function listarElegibles(sorteoId: string, take = 50) {
  const sorteo = await assertSorteo(sorteoId);

  const where: Prisma.EventoParticipanteWhereInput = {
    eventoId: sorteo.eventoId,
    participaSorteos: true,
    empleado: { activo: true, empresa: { activo: true } },
    ...(sorteo.asistenciaObligatoria && { asistencia: { isNot: null } }),
  };

  const reglasActivas = sorteo.reglas.filter((r) => r.activo);
  if (reglasActivas.length > 0) {
    where.AND = reglasActivas.map(reglaToWhere);
  }

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
            empresa: { select: { codigo: true, nombre: true } },
          },
        },
        asistencia: { select: { registradoAt: true } },
      },
    }),
    prisma.eventoParticipante.count({ where }),
  ]);

  return { total, data, reglasAplicadas: reglasActivas.length };
}
