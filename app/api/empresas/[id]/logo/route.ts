import path from "node:path";

import { handleApiError, ok } from "@/lib/api";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { saveEmpresaLogo } from "@/modules/empleados/lib/fotos";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export async function POST(
  request: Request,
  context: RouteContext<"/api/empresas/[id]/logo">,
) {
  try {
    await requirePermission("EMPRESAS_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const empresa = await empresaRepository.findById(id);
    if (!empresa) {
      throw new NotFoundError("Empresa no encontrada");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Seleccione un archivo de imagen para el logo");
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new ValidationError("El logo supera el límite de 5 MB");
    }

    const ext = path.extname(file.name).toLowerCase() || ".png";
    if (!ALLOWED_EXT.has(ext)) {
      throw new ValidationError(
        "Formato no permitido (use .png, .jpg, .webp o .svg)",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveEmpresaLogo(empresa.codigo, buffer, ext);

    return ok(
      {
        empresaCodigo: empresa.codigo,
        ruta: `public/fotos/${empresa.codigo}/logo${ext}`,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
