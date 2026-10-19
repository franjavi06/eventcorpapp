import { handleApiError, ok } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { listCandidatos } from "@/modules/participantes/services/participante.service";

export async function GET(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/candidatos">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    const params = new URL(request.url).searchParams;
    const q = params.get("q") ?? undefined;
    const excludeParticipantes = params.get("excluirParticipantes") === "1";
    return ok(await listCandidatos(id, q, excludeParticipantes));
  } catch (error) {
    return handleApiError(error);
  }
}
