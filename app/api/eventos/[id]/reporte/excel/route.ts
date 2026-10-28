import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { idParamSchema } from "@/lib/validations/common";
import { getReporteEvento } from "@/modules/reportes/services/reporte.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/reporte/excel">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    const r = await getReporteEvento(id);

    const participantes = await prisma.eventoParticipante.findMany({
      where: { eventoId: id },
      orderBy: [
        { empleado: { empresa: { nombre: "asc" } } },
        { empleado: { apellidos: "asc" } },
        { empleado: { nombres: "asc" } },
      ],
      include: {
        empleado: {
          select: {
            codigo: true,
            identificacion: true,
            nombres: true,
            apellidos: true,
            correo: true,
            telefono: true,
            puesto: true,
            departamento: true,
            empresa: { select: { codigo: true, nombre: true } },
          },
        },
        asistencia: { select: { registradoAt: true } },
      },
    });

    const wb = new ExcelJS.Workbook();

    // Hoja 1: Resumen y Empresas
    const resumenSheet = wb.addWorksheet("Resumen");
    resumenSheet.addRow(["Reporte de Evento", r.evento.nombre]).font = {
      bold: true,
      size: 13,
    };
    resumenSheet.addRow(["Código", r.evento.codigo]);
    resumenSheet.addRow(["Estado", r.evento.estado]);
    resumenSheet.addRow([
      "Fechas",
      `${formatDateTime(r.evento.fechaInicio)} — ${formatDateTime(r.evento.fechaFin)}`,
    ]);
    resumenSheet.addRow(["Ubicación", r.evento.ubicacion ?? "—"]);
    resumenSheet.addRow([]);

    const kpiHeader = resumenSheet.addRow(["Indicador", "Total"]);
    kpiHeader.font = { bold: true };
    resumenSheet.addRow(["Empresas participantes", r.totales.empresas]);
    resumenSheet.addRow(["Participantes inscritos", r.totales.participantes]);
    resumenSheet.addRow(["Asistencias (Check-in)", r.totales.asistencias]);
    resumenSheet.addRow(["Elegibles para sorteos", r.totales.elegibles]);
    resumenSheet.addRow(["Sorteos", r.totales.sorteos]);
    resumenSheet.addRow(["Ganadores adjudicados", r.totales.ganadores]);
    resumenSheet.addRow([]);

    const empHeader = resumenSheet.addRow([
      "Empresa",
      "Código",
      "Participantes",
      "Asistencias",
    ]);
    empHeader.font = { bold: true };
    for (const emp of r.empresas) {
      resumenSheet.addRow([
        emp.nombre,
        emp.codigo,
        emp.participantes,
        emp.asistencias,
      ]);
    }
    resumenSheet.columns.forEach((col) => {
      col.width = 26;
    });

    // Hoja 2: Ganadores
    const ganadoresSheet = wb.addWorksheet("Ganadores");
    const ganHeader = ganadoresSheet.addRow([
      "Empleado",
      "Código",
      "Puesto",
      "Departamento",
      "Empresa",
      "Sorteo",
      "Fecha Adjudicación",
    ]);
    ganHeader.font = { bold: true };
    for (const g of r.ganadores) {
      ganadoresSheet.addRow([
        g.empleado,
        g.codigoEmpleado,
        g.puesto ?? "",
        g.departamento ?? "",
        g.empresa,
        g.sorteo,
        formatDateTime(g.creadoAt),
      ]);
    }
    ganadoresSheet.columns.forEach((col) => {
      col.width = 24;
    });

    // Hoja 3: Participantes y Asistencia
    const partSheet = wb.addWorksheet("Participantes");
    const partHeader = partSheet.addRow([
      "Código",
      "Apellidos",
      "Nombres",
      "Identificación",
      "Correo",
      "Teléfono",
      "Puesto",
      "Departamento",
      "Empresa",
      "Asistió",
      "Hora Check-in",
      "Elegible Sorteos",
      "Motivo Exclusión",
    ]);
    partHeader.font = { bold: true };
    for (const p of participantes) {
      const emp = p.empleado;
      partSheet.addRow([
        emp.codigo,
        emp.apellidos,
        emp.nombres,
        emp.identificacion ?? "",
        emp.correo ?? "",
        emp.telefono ?? "",
        emp.puesto ?? "",
        emp.departamento ?? "",
        emp.empresa.nombre,
        p.asistencia ? "Sí" : "No",
        p.asistencia ? formatDateTime(p.asistencia.registradoAt) : "",
        p.participaSorteos ? "Sí" : "No",
        p.exclusionMotivo ?? "",
      ]);
    }
    partSheet.columns.forEach((col) => {
      col.width = 22;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const safeCodigo = r.evento.codigo.replace(/[^A-Za-z0-9_-]/g, "_");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-${safeCodigo}.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
