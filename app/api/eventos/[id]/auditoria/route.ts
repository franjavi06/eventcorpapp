import { handleApiError, ok } from "@/lib/api";
import { listAuditoriaEvento } from "@/modules/auditoria/services/auditoria.service";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/eventos/[id]/auditoria">,
) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const result = await listAuditoriaEvento(
      id,
      Object.fromEntries(searchParams),
    );
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
