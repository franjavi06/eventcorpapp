import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeCodigoKey } from "@/modules/empleados/lib/fotos";

const participanteInclude = {
  empleado: {
    select: {
      id: true,
      codigo: true,
      identificacion: true,
      nombres: true,
      apellidos: true,
      correo: true,
      activo: true,
      empresa: { select: { id: true, codigo: true, nombre: true } },
    },
  },
  asistencia: { select: { id: true, registradoAt: true } },
} satisfies Prisma.EventoParticipanteInclude;

export const participanteRepository = {
  findMany(args: {
    where?: Prisma.EventoParticipanteWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.EventoParticipanteOrderByWithRelationInput[];
  }) {
    const { orderBy, ...rest } = args;
    return prisma.eventoParticipante.findMany({
      ...rest,
      orderBy: orderBy ?? [
        { empleado: { apellidos: "asc" } },
        { empleado: { nombres: "asc" } },
      ],
      include: participanteInclude,
    });
  },

  count(where?: Prisma.EventoParticipanteWhereInput) {
    return prisma.eventoParticipante.count({ where });
  },

  findByEventoEmpleado(eventoId: string, empleadoId: string) {
    return prisma.eventoParticipante.findUnique({
      where: { eventoId_empleadoId: { eventoId, empleadoId } },
      include: participanteInclude,
    });
  },

  create(data: Prisma.EventoParticipanteUncheckedCreateInput) {
    return prisma.eventoParticipante.create({
      data,
      include: participanteInclude,
    });
  },

  update(id: string, data: Prisma.EventoParticipanteUncheckedUpdateInput) {
    return prisma.eventoParticipante.update({
      where: { id },
      data,
      include: participanteInclude,
    });
  },

  remove(id: string) {
    return prisma.eventoParticipante.delete({ where: { id } });
  },

  createAsistencia(
    eventoParticipanteId: string,
    registradoPor: string | null = null,
  ) {
    return prisma.asistencia.create({
      data: { eventoParticipanteId, registradoPor },
    });
  },

  deleteAsistencia(eventoParticipanteId: string) {
    return prisma.asistencia.delete({ where: { eventoParticipanteId } });
  },

  /** Empleados activos cuyas empresas están habilitadas (y activas) en el evento. */
  findCandidatos(args: {
    eventoId: string;
    q?: string;
    excludeParticipantes?: boolean;
    take?: number;
  }) {
    const { eventoId, q, excludeParticipantes = false, take = 15 } = args;
    return prisma.empleado.findMany({
      where: {
        activo: true,
        empresa: {
          activo: true,
          eventos: { some: { eventoId } },
        },
        ...(excludeParticipantes && {
          participaciones: { none: { eventoId } },
        }),
        ...(q && {
          OR: [
            { codigo: { contains: q, mode: "insensitive" } },
            { identificacion: { contains: q, mode: "insensitive" } },
            { nombres: { contains: q, mode: "insensitive" } },
            { apellidos: { contains: q, mode: "insensitive" } },
            { correo: { contains: q, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        codigo: true,
        identificacion: true,
        nombres: true,
        apellidos: true,
        correo: true,
        empresa: { select: { id: true, codigo: true, nombre: true } },
        participaciones: {
          where: { eventoId },
          select: { id: true, asistencia: { select: { id: true } } },
        },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      take,
    });
  },

  /** Empleados con ese código cuyas empresas están habilitadas en el evento. */
  async findEmpleadosPorCodigo(eventoId: string, codigo: string) {
    const exact = await prisma.empleado.findMany({
      where: {
        codigo: { equals: codigo, mode: "insensitive" },
        empresa: { eventos: { some: { eventoId } } },
      },
      select: { id: true },
    });
    if (exact.length > 0 || !/^\d+$/.test(codigo.trim())) {
      return exact;
    }

    // Si es numérico y difiere en ceros a la izquierda (ej. "0033" vs "00033")
    const targetKey = normalizeCodigoKey(codigo);
    const candidatos = await prisma.empleado.findMany({
      where: {
        codigo: { endsWith: targetKey },
        empresa: { eventos: { some: { eventoId } } },
      },
      select: { id: true, codigo: true },
    });
    return candidatos
      .filter((e) => normalizeCodigoKey(e.codigo) === targetKey)
      .map(({ id }) => ({ id }));
  },

  /** Empleado con su empresa y la asociación empresa-evento (si existe). */
  findEmpleadoParaEvento(eventoId: string, empleadoId: string) {
    return prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: {
        id: true,
        codigo: true,
        nombres: true,
        apellidos: true,
        activo: true,
        empresaId: true,
        empresa: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            activo: true,
            eventos: {
              where: { eventoId },
              select: { eventoId: true },
            },
          },
        },
      },
    });
  },

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(fn);
  },
};
