import { handleApiError, ok, parseJson } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  cuotaSchema,
  sorteoIdParamsSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import { addCuota } from "@/modules/sorteos/services/sorteo.service";

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/cuotas">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    const input = await parseJson(request, cuotaSchema);
    return ok(await addCuota(sorteoId, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
