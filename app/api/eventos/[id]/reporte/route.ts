import { handleApiError, ok } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { getReporteEvento } from "@/modules/reportes/services/reporte.service";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/eventos/[id]/reporte">,
) {
  try {
    await requirePermission("REPORTES_READ");
    const { id } = await ctx.params;
    return ok(await getReporteEvento(id));
  } catch (error) {
    return handleApiError(error);
  }
}
