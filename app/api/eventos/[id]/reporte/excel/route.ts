import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { buildEventoReporteExcel } from "@/modules/reportes/services/reporte-export.service";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/reporte/excel">,
) {
  try {
    await requirePermission("REPORTES_READ");
    const { id } = idParamSchema.parse(await context.params);
    const { buffer, filename } = await buildEventoReporteExcel(id);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
