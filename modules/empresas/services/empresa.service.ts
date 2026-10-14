import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";
import {
  empresaCreateSchema,
  empresaUpdateSchema,
  type EmpresaListQuery,
} from "@/modules/empresas/schemas/empresa.schema";

export async function listEmpresas(query: EmpresaListQuery) {
  const { page, pageSize, q, activo } = query;

  const where: Prisma.EmpresaWhereInput = {
    ...(activo !== "all" && { activo: activo === "true" }),
    ...(q && {
      OR: [
        { codigo: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    empresaRepository.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    empresaRepository.count(where),
  ]);

  return { data, total, page, pageSize };
}

export async function getEmpresa(id: string) {
  const empresa = await empresaRepository.findById(id);
  if (!empresa) throw new NotFoundError("Empresa no encontrada");
  return empresa;
}

export async function createEmpresa(input: unknown) {
  const data = empresaCreateSchema.parse(input);
  try {
    return await empresaRepository.create(data);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        `Ya existe una empresa con el código "${data.codigo}"`,
      );
    }
    throw error;
  }
}

export async function updateEmpresa(id: string, input: unknown) {
  const data = empresaUpdateSchema.parse(input);
  try {
    return await empresaRepository.update(id, data);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(
        `Ya existe una empresa con el código "${data.codigo}"`,
      );
    }
    if (isRecordNotFound(error)) throw new NotFoundError("Empresa no encontrada");
    throw error;
  }
}
