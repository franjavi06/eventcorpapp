import { handleApiError, ok } from "@/lib/api";
import { sorteoIdParamsSchema } from "@/modules/sorteos/schemas/sorteo.schema";
import {
  listarElegibles,
  simularSorteo,
} from "@/modules/sorteos/services/sorteo.service";

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

export async function POST(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/elegibles">,
) {
  try {
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    return ok(await simularSorteo(sorteoId));
  } catch (error) {
    return handleApiError(error);
  }
}
