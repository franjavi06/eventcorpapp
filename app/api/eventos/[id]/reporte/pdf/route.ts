import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { buildEventoReportePdf } from "@/modules/reportes/services/reporte-export.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/reporte/pdf">,
) {
  try {
    await requirePermission("REPORTES_READ");
    const { id } = idParamSchema.parse(await context.params);
    const { buffer, filename } = await buildEventoReportePdf(id);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
