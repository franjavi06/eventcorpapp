import { handleApiError, ok } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { listCandidatos } from "@/modules/participantes/services/participante.service";

export async function GET(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/candidatos">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    const q = new URL(request.url).searchParams.get("q") ?? undefined;
    return ok(await listCandidatos(id, q));
  } catch (error) {
    return handleApiError(error);
  }
}
