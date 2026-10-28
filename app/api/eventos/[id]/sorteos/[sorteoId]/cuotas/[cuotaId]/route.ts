import { handleApiError, ok, parseJson } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  cuotaIdParamsSchema,
  cuotaUpdateSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
  removeCuota,
  updateCuota,
} from "@/modules/sorteos/services/sorteo.service";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/cuotas/[cuotaId]">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { cuotaId } = cuotaIdParamsSchema.parse(await context.params);
    const body = await parseJson(request, cuotaUpdateSchema);
    return ok(await updateCuota(cuotaId, body));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/cuotas/[cuotaId]">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { cuotaId } = cuotaIdParamsSchema.parse(await context.params);
    return ok(await removeCuota(cuotaId));
  } catch (error) {
    return handleApiError(error);
  }
}
