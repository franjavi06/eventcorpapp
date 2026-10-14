import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { empleadoRepository } from "@/modules/empleados/repositories/empleado.repository";
import {
  empleadoCreateSchema,
  empleadoUpdateSchema,
  type EmpleadoListQuery,
} from "@/modules/empleados/schemas/empleado.schema";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

function translateEmpleadoError(error: unknown, codigo?: string): never {
  if (isUniqueViolation(error)) {
    throw new ConflictError(
      codigo
        ? `Ya existe un empleado con el código "${codigo}" en esa empresa, correo o identificación duplicados`
        : "Código, correo o identificación duplicados",
    );
  }
  if (isRecordNotFound(error)) throw new NotFoundError("Empleado no encontrado");
  throw error;
}

async function assertEmpresaExists(empresaId: string) {
  const empresa = await empresaRepository.findById(empresaId);
  if (!empresa) {
    throw new ValidationError("La empresa indicada no existe", {
      empresaId,
    });
  }
}

export async function listEmpleados(query: EmpleadoListQuery) {
  const { page, pageSize, q, empresaId, activo } = query;

  const where: Prisma.EmpleadoWhereInput = {
    ...(empresaId && { empresaId }),
    ...(activo !== "all" && { activo: activo === "true" }),
    ...(q && {
      OR: [
        { codigo: { contains: q, mode: "insensitive" } },
        { nombres: { contains: q, mode: "insensitive" } },
        { apellidos: { contains: q, mode: "insensitive" } },
        { correo: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    empleadoRepository.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    empleadoRepository.count(where),
  ]);

  return { data, total, page, pageSize };
}

export async function getEmpleado(id: string) {
  const empleado = await empleadoRepository.findById(id);
  if (!empleado) throw new NotFoundError("Empleado no encontrado");
  return empleado;
}

export async function createEmpleado(input: unknown) {
  const data = empleadoCreateSchema.parse(input);
  await assertEmpresaExists(data.empresaId);
  try {
    return await empleadoRepository.create(data);
  } catch (error) {
    translateEmpleadoError(error, data.codigo);
  }
}

export async function updateEmpleado(id: string, input: unknown) {
  const data = empleadoUpdateSchema.parse(input);
  if (data.empresaId) await assertEmpresaExists(data.empresaId);
  try {
    return await empleadoRepository.update(id, data);
  } catch (error) {
    translateEmpleadoError(error, data.codigo);
  }
}
