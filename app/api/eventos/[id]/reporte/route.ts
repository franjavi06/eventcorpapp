import { handleApiError, ok } from "@/lib/api";
import { getReporteEvento } from "@/modules/reportes/services/reporte.service";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/eventos/[id]/reporte">,
) {
  try {
    const { id } = await ctx.params;
    return ok(await getReporteEvento(id));
  } catch (error) {
    return handleApiError(error);
  }
}
