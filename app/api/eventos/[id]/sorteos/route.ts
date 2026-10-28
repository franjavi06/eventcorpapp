import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  sorteoCreateSchema,
  sorteoListQuerySchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
  createSorteo,
  listSorteos,
} from "@/modules/sorteos/services/sorteo.service";

export async function GET(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    const { searchParams } = new URL(request.url);
    const query = sorteoListQuerySchema.parse(Object.fromEntries(searchParams));
    return ok(await listSorteos(id, query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos">,
) {
  try {
    await requirePermission("SORTEOS_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, sorteoCreateSchema);
    return ok(await createSorteo(id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
