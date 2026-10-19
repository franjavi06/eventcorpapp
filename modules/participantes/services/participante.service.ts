import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  isForeignKeyViolation,
  isRecordNotFound,
  isUniqueViolation,
} from "@/lib/prisma-errors";
import { registrarAuditoria } from "@/modules/auditoria/lib/audit";
import { eventoRepository } from "@/modules/eventos/repositories/evento.repository";
import { participanteRepository } from "@/modules/participantes/repositories/participante.repository";
import {
  asistenciaCreateSchema,
  exclusionSchema,
  participanteCreateSchema,
  type ParticipanteListQuery,
} from "@/modules/participantes/schemas/participante.schema";

async function assertEvento(eventoId: string) {
  const evento = await eventoRepository.findById(eventoId);
  if (!evento) throw new NotFoundError("Evento no encontrado");
  return evento;
}

/** Empleado válido para participar: existe, activo, empresa habilitada y activa. */
async function assertEmpleadoHabilitado(eventoId: string, empleadoId: string) {
  const empleado = await participanteRepository.findEmpleadoParaEvento(
    eventoId,
    empleadoId,
  );
  if (!empleado) {
    throw new ValidationError("El empleado indicado no existe", { empleadoId });
  }
  if (!empleado.activo) {
    throw new ValidationError("El empleado está inactivo");
  }
  if (!empleado.empresa.activo) {
    throw new ValidationError(
      `La empresa "${empleado.empresa.nombre}" está inactiva`,
    );
  }
  if (empleado.empresa.eventos.length === 0) {
    throw new ValidationError(
      `El empleado pertenece a "${empleado.empresa.nombre}", que no está habilitada para este evento`,
    );
  }
  return empleado;
}

export async function listParticipantes(
  eventoId: string,
  query: ParticipanteListQuery,
  orderBy?: Prisma.EventoParticipanteOrderByWithRelationInput[],
) {
  await assertEvento(eventoId);
  const { page, pageSize, q, empresaId, asistencia, sorteos } = query;

  const where: Prisma.EventoParticipanteWhereInput = {
    eventoId,
    ...(empresaId && { empresaId }),
    ...(asistencia !== "all" && {
      asistencia: asistencia === "si" ? { isNot: null } : { is: null },
    }),
    ...(sorteos !== "all" && {
      participaSorteos: sorteos === "elegibles",
    }),
    ...(q && {
      empleado: {
        OR: [
          { codigo: { contains: q, mode: "insensitive" } },
          { identificacion: { contains: q, mode: "insensitive" } },
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
          { correo: { contains: q, mode: "insensitive" } },
        ],
      },
    }),
  };

  const [data, total] = await Promise.all([
    participanteRepository.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    participanteRepository.count(where),
  ]);

  return { data, total, page, pageSize };
}

export async function addParticipante(eventoId: string, input: unknown) {
  const { empleadoId } = participanteCreateSchema.parse(input);
  await assertEvento(eventoId);
  const empleado = await assertEmpleadoHabilitado(eventoId, empleadoId);

  const existente = await participanteRepository.findByEventoEmpleado(
    eventoId,
    empleadoId,
  );
  if (existente) {
    throw new ConflictError("El empleado ya es participante de este evento");
  }

  try {
    const participante = await participanteRepository.create({
      eventoId,
      empresaId: empleado.empresaId,
      empleadoId,
    });
    await registrarAuditoria({
      eventoId,
      entidad: "EventoParticipante",
      entidadId: participante.id,
      accion: "AGREGAR_PARTICIPANTE",
      despues: { empleadoId, empresaId: empleado.empresaId },
    });
    return participante;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        "El empleado ya es participante de este evento",
      );
    }
    if (isForeignKeyViolation(error)) {
      throw new ValidationError(
        "La empresa del empleado ya no está habilitada para este evento",
      );
    }
    throw error;
  }
}

export async function excluirDeSorteos(
  eventoId: string,
  empleadoId: string,
  input: unknown,
) {
  const { motivo, responsable } = exclusionSchema.parse(input);
  await assertEvento(eventoId);

  const participante = await participanteRepository.findByEventoEmpleado(
    eventoId,
    empleadoId,
  );
  if (!participante) {
    throw new NotFoundError("El empleado no es participante de este evento");
  }
  if (!participante.participaSorteos) {
    throw new ConflictError("El participante ya está excluido de los sorteos");
  }

  const actualizado = await participanteRepository.update(participante.id, {
    participaSorteos: false,
    exclusionMotivo: motivo,
    exclusionAt: new Date(),
    exclusionPor: responsable,
  });
  await registrarAuditoria({
    eventoId,
    entidad: "EventoParticipante",
    entidadId: participante.id,
    accion: "EXCLUIR_SORTEOS",
    actor: responsable,
    antes: { participaSorteos: true },
    despues: {
      participaSorteos: false,
      exclusionMotivo: motivo,
      exclusionPor: responsable,
    },
  });
  return actualizado;
}

export async function checkIn(eventoId: string, input: unknown) {
  const parsed = asistenciaCreateSchema.parse(input);
  await assertEvento(eventoId);

  let empleadoId = parsed.empleadoId;
  if (!empleadoId && parsed.codigo) {
    const coincidencias = await participanteRepository.findEmpleadosPorCodigo(
      eventoId,
      parsed.codigo,
    );
    if (coincidencias.length === 0) {
      throw new ValidationError(
        `No se encontró empleado con el código "${parsed.codigo}" en las empresas habilitadas`,
      );
    }
    if (coincidencias.length > 1) {
      throw new ConflictError(
        `El código "${parsed.codigo}" existe en varias empresas habilitadas; use la búsqueda manual`,
      );
    }
    empleadoId = coincidencias[0].id;
  }
  if (!empleadoId) {
    throw new ValidationError("Indique empleadoId o codigo");
  }

  const empleado = await assertEmpleadoHabilitado(eventoId, empleadoId);

  try {
    return await participanteRepository.transaction(async (tx) => {
      const participante = await tx.eventoParticipante.upsert({
        where: { eventoId_empleadoId: { eventoId, empleadoId } },
        create: { eventoId, empresaId: empleado.empresaId, empleadoId },
        update: {},
      });
      const asistencia = await tx.asistencia.create({
        data: { eventoParticipanteId: participante.id },
      });
      await registrarAuditoria(
        {
          eventoId,
          entidad: "Asistencia",
          entidadId: asistencia.id,
          accion: "CHECK_IN",
          despues: {
            empleadoId,
            participanteId: participante.id,
            registradoAt: asistencia.registradoAt.toISOString(),
          },
        },
        tx,
      );
      return {
        participanteId: participante.id,
        asistencia,
        empleado: {
          codigo: empleado.codigo,
          nombre: `${empleado.nombres} ${empleado.apellidos}`,
          empresa: empleado.empresa.nombre,
        },
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("El empleado ya registró su asistencia");
    }
    if (isForeignKeyViolation(error)) {
      throw new ValidationError(
        "La empresa del empleado ya no está habilitada para este evento",
      );
    }
    throw error;
  }
}

export async function undoCheckIn(eventoId: string, empleadoId: string) {
  const participante = await participanteRepository.findByEventoEmpleado(
    eventoId,
    empleadoId,
  );
  if (!participante) {
    throw new NotFoundError("El empleado no es participante de este evento");
  }
  try {
    await participanteRepository.deleteAsistencia(participante.id);
    await registrarAuditoria({
      eventoId,
      entidad: "Asistencia",
      entidadId: participante.id,
      accion: "ANULAR_CHECK_IN",
      antes: {
        empleadoId,
        registradoAt: participante.asistencia?.registradoAt.toISOString(),
      },
    });
    return { removed: true };
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw new NotFoundError("El participante no tiene asistencia registrada");
    }
    throw error;
  }
}

export async function removeParticipante(eventoId: string, empleadoId: string) {
  const participante = await participanteRepository.findByEventoEmpleado(
    eventoId,
    empleadoId,
  );
  if (!participante) {
    throw new NotFoundError("El empleado no es participante de este evento");
  }
  if (participante.asistencia) {
    throw new ConflictError(
      "No se puede quitar un participante que ya registró asistencia",
    );
  }
  await participanteRepository.remove(participante.id);
  await registrarAuditoria({
    eventoId,
    entidad: "EventoParticipante",
    entidadId: participante.id,
    accion: "QUITAR_PARTICIPANTE",
    antes: { empleadoId, participaSorteos: participante.participaSorteos },
  });
  return { removed: true };
}

export async function listCandidatos(
  eventoId: string,
  q?: string,
  excludeParticipantes = false,
) {
  await assertEvento(eventoId);
  return participanteRepository.findCandidatos({
    eventoId,
    q,
    excludeParticipantes,
  });
}
