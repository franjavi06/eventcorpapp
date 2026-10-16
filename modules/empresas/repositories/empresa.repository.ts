import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const empresaRepository = {
  findMany(args: {
    where?: Prisma.EmpresaWhereInput;
    skip: number;
    take: number;
  }) {
    return prisma.empresa.findMany({
      ...args,
      orderBy: { nombre: "asc" },
      include: { _count: { select: { empleados: true } } },
    });
  },

  count(where?: Prisma.EmpresaWhereInput) {
    return prisma.empresa.count({ where });
  },

  findById(id: string) {
    return prisma.empresa.findUnique({ where: { id } });
  },

  findAllActive() {
    return prisma.empresa.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, codigo: true, nombre: true },
    });
  },

  findAll() {
    return prisma.empresa.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, codigo: true, nombre: true, activo: true },
    });
  },

  create(data: Prisma.EmpresaCreateInput) {
    return prisma.empresa.create({ data });
  },

  update(id: string, data: Prisma.EmpresaUpdateInput) {
    return prisma.empresa.update({ where: { id }, data });
  },
};
