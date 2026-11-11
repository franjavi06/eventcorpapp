import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { buildGlobalReportePdf } from "@/modules/reportes/services/reporte-export.service";

export async function GET() {
  try {
    await requirePermission("REPORTES_READ");
    const { buffer, filename } = await buildGlobalReportePdf();

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
