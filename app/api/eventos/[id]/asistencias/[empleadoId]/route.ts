import { z } from "zod";

import { handleApiError, ok } from "@/lib/api";
import { uuidSchema } from "@/lib/validations/common";
import { undoCheckIn } from "@/modules/participantes/services/participante.service";

const paramsSchema = z.object({
  id: uuidSchema,
  empleadoId: uuidSchema,
});

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/asistencias/[empleadoId]">,
) {
  try {
    const { id, empleadoId } = paramsSchema.parse(await context.params);
    return ok(await undoCheckIn(id, empleadoId));
  } catch (error) {
    return handleApiError(error);
  }
}
