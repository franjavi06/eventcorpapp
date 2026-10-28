import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { asistenciaCreateSchema } from "@/modules/participantes/schemas/participante.schema";
import { checkIn } from "@/modules/participantes/services/participante.service";

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/asistencias">,
) {
  try {
    await requirePermission("CHECKIN_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, asistenciaCreateSchema);
    return ok(await checkIn(id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
