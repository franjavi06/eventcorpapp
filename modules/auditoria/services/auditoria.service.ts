import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { paginationSchema } from "@/lib/validations/common";

const auditQuerySchema = paginationSchema.extend({
  entidad: z.string().trim().max(50).optional(),
  accion: z.string().trim().max(50).optional(),
});

export async function listAuditoriaEvento(eventoId: string, input: unknown) {
  const { page, pageSize, entidad, accion } = auditQuerySchema.parse(input);
  const where = {
    eventoId,
    ...(entidad && { entidad }),
    ...(accion && { accion }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, data };
}
