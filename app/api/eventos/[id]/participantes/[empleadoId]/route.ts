import { z } from "zod";

import { handleApiError, ok, parseJson } from "@/lib/api";
import { uuidSchema } from "@/lib/validations/common";
import { exclusionSchema } from "@/modules/participantes/schemas/participante.schema";
import {
  excluirDeSorteos,
  removeParticipante,
} from "@/modules/participantes/services/participante.service";

const paramsSchema = z.object({
  id: uuidSchema,
  empleadoId: uuidSchema,
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/participantes/[empleadoId]">,
) {
  try {
    const { id, empleadoId } = paramsSchema.parse(await context.params);
    const input = await parseJson(request, exclusionSchema);
    return ok(await excluirDeSorteos(id, empleadoId, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/participantes/[empleadoId]">,
) {
  try {
    const { id, empleadoId } = paramsSchema.parse(await context.params);
    return ok(await removeParticipante(id, empleadoId));
  } catch (error) {
    return handleApiError(error);
  }
}
