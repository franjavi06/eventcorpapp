import { handleApiError, ok, parseJson } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { sorteoCargaMasivaSchema } from "@/modules/sorteos/schemas/sorteo.schema";
import {
  createSorteosBulk,
  parseSorteosExcel,
} from "@/modules/sorteos/services/sorteo.service";

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/carga">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        throw new ValidationError("Debe adjuntar un archivo Excel (.xlsx)");
      }
      const estadoRaw = formData.get("estado");
      const estado = estadoRaw === "ACTIVO" ? "ACTIVO" : "BORRADOR";
      const asistenciaRaw = formData.get("asistenciaObligatoria");
      const asistenciaObligatoria = asistenciaRaw !== "false";

      const items = await parseSorteosExcel(await file.arrayBuffer());
      const resultado = await createSorteosBulk(id, {
        items,
        estado,
        asistenciaObligatoria,
      });
      return ok(resultado, 201);
    }

    const input = await parseJson(request, sorteoCargaMasivaSchema);
    return ok(await createSorteosBulk(id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
