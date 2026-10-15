import { handleApiError, ok, parseJson } from "@/lib/api";
import {
  reglaSchema,
  sorteoIdParamsSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
  addRegla,
  getSorteo,
} from "@/modules/sorteos/services/sorteo.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/reglas">,
) {
  try {
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    const sorteo = await getSorteo(sorteoId);
    return ok(sorteo.reglas);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/reglas">,
) {
  try {
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    const input = await parseJson(request, reglaSchema);
    return ok(await addRegla(sorteoId, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
