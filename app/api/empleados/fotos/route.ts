import path from "node:path";

import { handleApiError, ok } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { uuidSchema } from "@/lib/validations/common";
import {
  ensureEmpresaFotoDir,
  normalizeCodigoKey,
  saveEmpleadoFoto,
} from "@/modules/empleados/lib/fotos";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const empresaIdRaw = form.get("empresaId");
    const parsedId = uuidSchema.safeParse(empresaIdRaw);
    if (!parsedId.success) {
      throw new ValidationError("Seleccione una empresa válida");
    }

    const empresa = await empresaRepository.findById(parsedId.data);
    if (!empresa) {
      throw new ValidationError("La empresa seleccionada no existe");
    }

    await ensureEmpresaFotoDir(empresa.codigo);

    const files = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      throw new ValidationError("Seleccione al menos una imagen (.jpg, .png o .webp)");
    }

    const empleadosEmpresa = await prisma.empleado.findMany({
      where: { empresaId: empresa.id },
      select: { codigo: true },
    });
    const codigoCanonicPorKey = new Map<string, string>();
    for (const e of empleadosEmpresa) {
      codigoCanonicPorKey.set(normalizeCodigoKey(e.codigo), e.codigo);
    }

    let guardadas = 0;
    let empleadosCoincidentes = 0;
    const sinEmpleado: string[] = [];
    const errores: { archivo: string; mensaje: string }[] = [];

    for (const file of files) {
      const parsed = path.parse(file.name);
      const ext = parsed.ext.toLowerCase();
      const codigoArchivo = parsed.name.trim();

      if (!ALLOWED_EXT.has(ext)) {
        errores.push({
          archivo: file.name,
          mensaje: "Formato no permitido (use .jpg, .jpeg, .png o .webp)",
        });
        continue;
      }
      if (file.size > MAX_FOTO_BYTES) {
        errores.push({
          archivo: file.name,
          mensaje: "Supera el límite de 5 MB por imagen",
        });
        continue;
      }

      try {
        const codigoCanonico = codigoCanonicPorKey.get(
          normalizeCodigoKey(codigoArchivo),
        );
        const codigoFinal = codigoCanonico ?? codigoArchivo;
        const buffer = Buffer.from(await file.arrayBuffer());
        await saveEmpleadoFoto(empresa.codigo, codigoFinal, buffer, ext);
        guardadas += 1;
        if (codigoCanonico) {
          empleadosCoincidentes += 1;
        } else {
          sinEmpleado.push(codigoArchivo);
        }
      } catch (err) {
        errores.push({
          archivo: file.name,
          mensaje:
            err instanceof ValidationError
              ? err.message
              : "No se pudo guardar la imagen",
        });
      }
    }

    return ok(
      {
        carpeta: `public/fotos/${empresa.codigo}`,
        guardadas,
        empleadosCoincidentes,
        sinEmpleado,
        errores,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
