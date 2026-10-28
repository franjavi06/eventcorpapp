import { handleApiError, ok, parseJson } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  reglaIdParamsSchema,
  reglaUpdateSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
  removeRegla,
  updateRegla,
} from "@/modules/sorteos/services/sorteo.service";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/reglas/[reglaId]">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { reglaId } = reglaIdParamsSchema.parse(await context.params);
    const input = await parseJson(request, reglaUpdateSchema);
    return ok(await updateRegla(reglaId, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/reglas/[reglaId]">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { reglaId } = reglaIdParamsSchema.parse(await context.params);
    return ok(await removeRegla(reglaId));
  } catch (error) {
    return handleApiError(error);
  }
}
