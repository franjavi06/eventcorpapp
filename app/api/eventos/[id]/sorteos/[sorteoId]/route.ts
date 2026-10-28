import { handleApiError, ok, parseJson } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  sorteoIdParamsSchema,
  sorteoUpdateSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
  deleteSorteo,
  getSorteo,
  updateSorteo,
} from "@/modules/sorteos/services/sorteo.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]">,
) {
  try {
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    return ok(await getSorteo(sorteoId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    const input = await parseJson(request, sorteoUpdateSchema);
    return ok(await updateSorteo(sorteoId, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    return ok(await deleteSorteo(sorteoId));
  } catch (error) {
    return handleApiError(error);
  }
}
