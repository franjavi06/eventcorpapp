import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api";
import { buildSorteosPlantillaExcel } from "@/modules/sorteos/services/sorteo.service";

export async function GET() {
  try {
    const buffer = await buildSorteosPlantillaExcel();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="plantilla-sorteos.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
