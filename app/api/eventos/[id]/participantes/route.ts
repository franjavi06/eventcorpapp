import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  participanteCreateSchema,
  participanteListQuerySchema,
} from "@/modules/participantes/schemas/participante.schema";
import {
  addParticipante,
  listParticipantes,
} from "@/modules/participantes/services/participante.service";

export async function GET(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/participantes">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    const { searchParams } = new URL(request.url);
    const query = participanteListQuerySchema.parse(
      Object.fromEntries(searchParams),
    );
    return ok(await listParticipantes(id, query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/participantes">,
) {
  try {
    await requirePermission("PARTICIPANTES_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, participanteCreateSchema);
    return ok(await addParticipante(id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
