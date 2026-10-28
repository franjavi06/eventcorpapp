import { z } from "zod";

import { handleApiError, ok } from "@/lib/api";
import { uuidSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
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
    await requirePermission("CHECKIN_WRITE");
    const { id, empleadoId } = paramsSchema.parse(await context.params);
    return ok(await undoCheckIn(id, empleadoId));
  } catch (error) {
    return handleApiError(error);
  }
}
