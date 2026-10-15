import { handleApiError, ok } from "@/lib/api";
import { sorteoIdParamsSchema } from "@/modules/sorteos/schemas/sorteo.schema";
import { listarElegibles } from "@/modules/sorteos/services/sorteo.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/elegibles">,
) {
  try {
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    return ok(await listarElegibles(sorteoId));
  } catch (error) {
    return handleApiError(error);
  }
}
