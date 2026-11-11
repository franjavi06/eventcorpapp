import { handleApiError, ok } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { getReporteGlobal } from "@/modules/reportes/services/reporte.service";

export async function GET() {
  try {
    await requirePermission("REPORTES_READ");
    return ok(await getReporteGlobal());
  } catch (error) {
    return handleApiError(error);
  }
}
