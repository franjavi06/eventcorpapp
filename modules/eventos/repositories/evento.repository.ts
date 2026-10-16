import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const empresaInclude = {
  empresa: {
    select: { id: true, codigo: true, nombre: true, activo: true },
  },
} satisfies Prisma.EventoEmpresaInclude;

export const eventoRepository = {
  findMany(args: {
    where?: Prisma.EventoWhereInput;
    skip: number;
    take: number;
  }) {
    return prisma.evento.findMany({
      ...args,
      orderBy: [{ fechaInicio: "desc" }, { nombre: "asc" }],
      include: { _count: { select: { empresas: true, sorteos: true } } },
    });
  },

  count(where?: Prisma.EventoWhereInput) {
    return prisma.evento.count({ where });
  },

  findById(id: string) {
    return prisma.evento.findUnique({
      where: { id },
      include: {
        empresas: {
          include: empresaInclude,
          orderBy: { empresa: { nombre: "asc" } },
        },
      },
    });
  },

  create(data: Prisma.EventoUncheckedCreateInput) {
    return prisma.evento.create({ data });
  },

  update(id: string, data: Prisma.EventoUncheckedUpdateInput) {
    return prisma.evento.update({ where: { id }, data });
  },

  addEmpresa(eventoId: string, empresaId: string) {
    return prisma.eventoEmpresa.create({ data: { eventoId, empresaId } });
  },

  removeEmpresa(eventoId: string, empresaId: string) {
    return prisma.eventoEmpresa.delete({
      where: { eventoId_empresaId: { eventoId, empresaId } },
    });
  },

  findEmpresasIds(eventoId: string) {
    return prisma.eventoEmpresa.findMany({
      where: { eventoId },
      select: { empresaId: true },
    });
  },
};
