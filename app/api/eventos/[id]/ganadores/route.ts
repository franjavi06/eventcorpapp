import { handleApiError, ok } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { getEvento } from "@/modules/eventos/services/evento.service";
import { listGanadoresEvento } from "@/modules/sorteos/services/ejecucion.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/ganadores">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    await getEvento(id);
    return ok(await listGanadoresEvento(id));
  } catch (error) {
    return handleApiError(error);
  }
}
