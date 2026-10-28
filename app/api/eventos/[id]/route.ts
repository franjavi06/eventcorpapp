import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { eventoUpdateSchema } from "@/modules/eventos/schemas/evento.schema";
import {
  getEvento,
  updateEvento,
} from "@/modules/eventos/services/evento.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    return ok(await getEvento(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/eventos/[id]">,
) {
  try {
    await requirePermission("EVENTOS_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, eventoUpdateSchema);
    return ok(await updateEvento(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
