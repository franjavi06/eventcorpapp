import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { buildGlobalReporteExcel } from "@/modules/reportes/services/reporte-export.service";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET() {
  try {
    await requirePermission("REPORTES_READ");
    const { buffer, filename } = await buildGlobalReporteExcel();

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
