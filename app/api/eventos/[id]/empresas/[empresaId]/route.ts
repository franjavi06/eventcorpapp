import { z } from "zod";

import { handleApiError, ok } from "@/lib/api";
import { uuidSchema } from "@/lib/validations/common";
import { removeEmpresaFromEvento } from "@/modules/eventos/services/evento.service";

const paramsSchema = z.object({ id: uuidSchema, empresaId: uuidSchema });

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/empresas/[empresaId]">,
) {
  try {
    const { id, empresaId } = paramsSchema.parse(await context.params);
    await removeEmpresaFromEvento(id, empresaId);
    return ok({ removed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
