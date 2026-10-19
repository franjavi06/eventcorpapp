import { ValidationError } from "@/lib/errors";
import { isUniqueViolation } from "@/lib/prisma-errors";
import {
  parseFechaCarga,
  type FilaCarga,
} from "@/modules/empleados/lib/carga-columns";
import { empleadoRepository } from "@/modules/empleados/repositories/empleado.repository";
import { empleadoCreateSchema } from "@/modules/empleados/schemas/empleado.schema";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

export const CARGA_MAX_FILAS = 1000;

export type ErrorFila = { fila: number; campo?: string; mensaje: string };

export type ResultadoCarga = {
  importados: number;
  errores: ErrorFila[];
};

const NOMBRE_CAMPO: Record<string, string> = {
  fecha_ingreso: "fechaIngreso",
};

function campoDe(path: PropertyKey | undefined): string | undefined {
  if (path == null) return undefined;
  const raw = String(path);
  return NOMBRE_CAMPO[raw] ?? raw;
}

/**
 * Construye el input para empleadoCreateSchema a partir de los valores
 * crudos de la fila. Devuelve null si falta el identificador de fecha.
 */
function construirInput(
  empresaId: string,
  valores: FilaCarga["valores"],
): Record<string, unknown> {
  return {
    empresaId,
    codigo: valores.codigo,
    identificacion: valores.identificacion,
    nombres: valores.nombres,
    apellidos: valores.apellidos,
    correo: valores.correo,
    departamento: valores.departamento,
    puesto: valores.puesto,
    zona: valores.zona,
    clasificacion: valores.clasificacion,
    fechaIngreso: parseFechaCarga(valores.fechaIngreso),
  };
}

function claveDuplicado(valores: FilaCarga["valores"]) {
  return {
    codigo: valores.codigo?.toString().trim().toLowerCase() ?? null,
    correo: valores.correo?.toString().trim().toLowerCase() ?? null,
    identificacion:
      valores.identificacion?.toString().trim().toLowerCase() ?? null,
  };
}

/**
 * Importación parcial: valida cada fila, omite duplicados dentro del
 * archivo, inserta las válidas y devuelve errores por número de fila.
 */
export async function importEmpleados(
  empresaId: string,
  filas: FilaCarga[],
): Promise<ResultadoCarga> {
  const empresa = await empresaRepository.findById(empresaId);
  if (!empresa) {
    throw new ValidationError("La empresa indicada no existe", { empresaId });
  }
  if (filas.length === 0) {
    throw new ValidationError("El archivo no contiene filas de datos");
  }
  if (filas.length > CARGA_MAX_FILAS) {
    throw new ValidationError(
      `El archivo supera el máximo de ${CARGA_MAX_FILAS} filas`,
    );
  }

  const errores: ErrorFila[] = [];
  let importados = 0;
  const vistos = new Map<string, number>();

  for (const { fila, valores } of filas) {
    // Duplicados dentro del archivo (codigo/correo/identificacion)
    const { codigo, correo, identificacion } = claveDuplicado(valores);
    const dup =
      (codigo && vistos.get(`codigo:${codigo}`)) ||
      (correo && vistos.get(`correo:${correo}`)) ||
      (identificacion && vistos.get(`identificacion:${identificacion}`));
    if (dup) {
      errores.push({
        fila,
        mensaje: `Duplicado de la fila ${dup} dentro del archivo`,
      });
      continue;
    }

    const parsed = empleadoCreateSchema.safeParse(
      construirInput(empresaId, valores),
    );
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errores.push({
        fila,
        campo: campoDe(issue?.path[0]),
        mensaje: issue?.message ?? "Datos inválidos",
      });
      continue;
    }

    if (codigo) vistos.set(`codigo:${codigo}`, fila);
    if (correo) vistos.set(`correo:${correo}`, fila);
    if (identificacion) vistos.set(`identificacion:${identificacion}`, fila);

    try {
      await empleadoRepository.create(parsed.data);
      importados += 1;
    } catch (error) {
      if (isUniqueViolation(error)) {
        errores.push({
          fila,
          campo: "codigo",
          mensaje: "Código, correo o identificación ya existen",
        });
        continue;
      }
      throw error;
    }
  }

  return { importados, errores };
}
