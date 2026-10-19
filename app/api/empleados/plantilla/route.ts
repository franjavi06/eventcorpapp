import { Workbook } from "exceljs";

import { handleApiError } from "@/lib/api";

const HEADERS = [
  "codigo",
  "identificacion",
  "nombres",
  "apellidos",
  "correo",
  "departamento",
  "puesto",
  "zona",
  "clasificacion",
  "fecha_ingreso",
];

const EJEMPLO = [
  "EMP-001",
  "001-1234567-8",
  "Juan",
  "Pérez",
  "juan.perez@empresa.com",
  "VENTAS",
  "Vendedor",
  "CENTRO",
  "OPERATIVO",
  new Date("2020-01-15"),
];

export async function GET() {
  try {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("empleados");
    sheet.addRow(HEADERS);
    sheet.addRow(EJEMPLO);
    sheet.getRow(1).font = { bold: true };
    for (const [i, h] of HEADERS.entries()) {
      sheet.getColumn(i + 1).width = Math.max(h.length + 4, 14);
    }
    sheet.getColumn(10).numFmt = "yyyy-mm-dd";

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(Buffer.from(buffer) as unknown as BodyInit, {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition":
          'attachment; filename="plantilla-empleados.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
