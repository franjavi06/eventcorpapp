import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const empresaSelect = {
  id: true,
  codigo: true,
  nombre: true,
} satisfies Prisma.EmpresaSelect;

export const empleadoRepository = {
  findMany(args: {
    where?: Prisma.EmpleadoWhereInput;
    skip: number;
    take: number;
  }) {
    return prisma.empleado.findMany({
      ...args,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      include: { empresa: { select: empresaSelect } },
    });
  },

  count(where?: Prisma.EmpleadoWhereInput) {
    return prisma.empleado.count({ where });
  },

  findById(id: string) {
    return prisma.empleado.findUnique({
      where: { id },
      include: { empresa: { select: empresaSelect } },
    });
  },

  create(data: Prisma.EmpleadoUncheckedCreateInput) {
    return prisma.empleado.create({ data });
  },

  update(id: string, data: Prisma.EmpleadoUncheckedUpdateInput) {
    return prisma.empleado.update({ where: { id }, data });
  },
};
