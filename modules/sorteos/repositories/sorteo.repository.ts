import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const sorteoInclude = {
  reglas: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
  cuotas: { orderBy: [{ orden: "asc" }, { createdAt: "asc" }] },
  _count: { select: { reglas: true, cuotas: true, ejecuciones: true } },
} satisfies Prisma.SorteoInclude;

export const sorteoRepository = {
  findMany(args: {
    where?: Prisma.SorteoWhereInput;
    skip: number;
    take: number;
  }) {
    return prisma.sorteo.findMany({
      ...args,
      orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      include: sorteoInclude,
    });
  },

  count(where?: Prisma.SorteoWhereInput) {
    return prisma.sorteo.count({ where });
  },

  findById(id: string) {
    return prisma.sorteo.findUnique({
      where: { id },
      include: {
        ...sorteoInclude,
        evento: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            empresas: {
              select: {
                empresa: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                    activo: true,
                  },
                },
              },
              orderBy: { empresa: { nombre: "asc" } },
            },
          },
        },
        ejecuciones: { where: { estado: "COMPLETADA" }, select: { id: true } },
      },
    });
  },

  create(data: Prisma.SorteoUncheckedCreateInput) {
    return prisma.sorteo.create({ data, include: sorteoInclude });
  },

  update(id: string, data: Prisma.SorteoUncheckedUpdateInput) {
    return prisma.sorteo.update({
      where: { id },
      data,
      include: sorteoInclude,
    });
  },

  remove(id: string) {
    return prisma.sorteo.delete({ where: { id } });
  },
};

export const reglaRepository = {
  findById(id: string) {
    return prisma.sorteoRegla.findUnique({ where: { id } });
  },

  create(data: Prisma.SorteoReglaUncheckedCreateInput) {
    return prisma.sorteoRegla.create({ data });
  },

  update(id: string, data: Prisma.SorteoReglaUncheckedUpdateInput) {
    return prisma.sorteoRegla.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.sorteoRegla.delete({ where: { id } });
  },
};

export const cuotaRepository = {
  findById(id: string) {
    return prisma.sorteoCuota.findUnique({ where: { id } });
  },

  create(data: Prisma.SorteoCuotaUncheckedCreateInput) {
    return prisma.sorteoCuota.create({ data });
  },

  update(id: string, data: Prisma.SorteoCuotaUncheckedUpdateInput) {
    return prisma.sorteoCuota.update({ where: { id }, data });
  },

  remove(id: string) {
    return prisma.sorteoCuota.delete({ where: { id } });
  },
};
