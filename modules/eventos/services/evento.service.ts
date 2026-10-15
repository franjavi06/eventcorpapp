import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  isForeignKeyViolation,
  isRecordNotFound,
  isUniqueViolation,
} from "@/lib/prisma-errors";
import { registrarAuditoria } from "@/modules/auditoria/lib/audit";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";
import { eventoRepository } from "@/modules/eventos/repositories/evento.repository";
import {
  eventoCreateSchema,
  eventoEmpresaSchema,
  eventoUpdateSchema,
  type EventoListQuery,
} from "@/modules/eventos/schemas/evento.schema";

export async function listEventos(query: EventoListQuery) {
  const { page, pageSize, q, estado } = query;

  const where: Prisma.EventoWhereInput = {
    ...(estado !== "all" && { estado }),
    ...(q && {
      OR: [
        { codigo: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
        { ubicacion: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    eventoRepository.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    eventoRepository.count(where),
  ]);

  return { data, total, page, pageSize };
}

export async function getEvento(id: string) {
  const evento = await eventoRepository.findById(id);
  if (!evento) throw new NotFoundError("Evento no encontrado");
  return evento;
}

export async function createEvento(input: unknown) {
  const data = eventoCreateSchema.parse(input);
  try {
    const evento = await eventoRepository.create(data);
    await registrarAuditoria({
      eventoId: evento.id,
      entidad: "Evento",
      entidadId: evento.id,
      accion: "CREAR",
      despues: { codigo: evento.codigo, nombre: evento.nombre, estado: evento.estado },
    });
    return evento;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        `Ya existe un evento con el código "${data.codigo}"`,
      );
    }
    throw error;
  }
}

export async function updateEvento(id: string, input: unknown) {
  const data = eventoUpdateSchema.parse(input);

  // Coherencia de fechas cuando solo se actualiza un extremo del rango
  if (data.fechaInicio || data.fechaFin) {
    const actual = await eventoRepository.findById(id);
    if (!actual) throw new NotFoundError("Evento no encontrado");
    const inicio = data.fechaInicio ?? actual.fechaInicio;
    const fin = data.fechaFin ?? actual.fechaFin;
    if (inicio > fin) {
      throw new ValidationError(
        "La fecha de inicio no puede ser posterior a la fecha de fin",
        { fechaInicio: inicio, fechaFin: fin },
      );
    }
  }

  try {
    const antes = await eventoRepository.findById(id);
    const evento = await eventoRepository.update(id, data);
    await registrarAuditoria({
      eventoId: id,
      entidad: "Evento",
      entidadId: id,
      accion: "ACTUALIZAR",
      antes: antes
        ? {
            codigo: antes.codigo,
            nombre: antes.nombre,
            estado: antes.estado,
            fechaInicio: antes.fechaInicio.toISOString(),
            fechaFin: antes.fechaFin.toISOString(),
          }
        : null,
      despues: {
        codigo: evento.codigo,
        nombre: evento.nombre,
        estado: evento.estado,
        fechaInicio: evento.fechaInicio.toISOString(),
        fechaFin: evento.fechaFin.toISOString(),
      },
    });
    return evento;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        `Ya existe un evento con el código "${data.codigo}"`,
      );
    }
    if (isRecordNotFound(error)) throw new NotFoundError("Evento no encontrado");
    throw error;
  }
}

export async function addEmpresaToEvento(eventoId: string, input: unknown) {
  const { empresaId } = eventoEmpresaSchema.parse(input);

  const evento = await eventoRepository.findById(eventoId);
  if (!evento) throw new NotFoundError("Evento no encontrado");

  const empresa = await empresaRepository.findById(empresaId);
  if (!empresa) {
    throw new ValidationError("La empresa indicada no existe", { empresaId });
  }
  if (!empresa.activo) {
    throw new ValidationError(
      `No se puede asociar la empresa "${empresa.nombre}" porque está inactiva`,
    );
  }
  if (evento.empresas.some((ee) => ee.empresaId === empresaId)) {
    throw new ConflictError(
      `La empresa "${empresa.nombre}" ya está asociada a este evento`,
    );
  }

  try {
    const asociacion = await eventoRepository.addEmpresa(eventoId, empresaId);
    await registrarAuditoria({
      eventoId,
      entidad: "EventoEmpresa",
      entidadId: empresaId,
      accion: "ASOCIAR_EMPRESA",
      despues: { empresaCodigo: empresa.codigo, empresaNombre: empresa.nombre },
    });
    return asociacion;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        `La empresa "${empresa.nombre}" ya está asociada a este evento`,
      );
    }
    throw error;
  }
}

export async function removeEmpresaFromEvento(eventoId: string, empresaId: string) {
  try {
    const result = await eventoRepository.removeEmpresa(eventoId, empresaId);
    await registrarAuditoria({
      eventoId,
      entidad: "EventoEmpresa",
      entidadId: empresaId,
      accion: "DESASOCIAR_EMPRESA",
      antes: { empresaId },
    });
    return result;
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw new NotFoundError("La empresa no está asociada a este evento");
    }
    if (isForeignKeyViolation(error)) {
      throw new ConflictError(
        "No se puede desasociar: la empresa tiene participantes registrados en el evento",
      );
    }
    throw error;
  }
}

/** Empresas activas aún no asociadas (para el selector del gestor). */
export async function listEmpresasDisponibles(eventoId: string) {
  const asociadas = await eventoRepository.findEmpresasIds(eventoId);
  const excluir = new Set(asociadas.map((e) => e.empresaId));
  const activas = await empresaRepository.findAllActive();
  return activas.filter((e) => !excluir.has(e.id));
}
