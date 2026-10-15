import { handleApiError, ok } from "@/lib/api";
import { getReporteGlobal } from "@/modules/reportes/services/reporte.service";

export async function GET() {
  try {
    return ok(await getReporteGlobal());
  } catch (error) {
    return handleApiError(error);
  }
}
