import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable, type UserOptions } from "jspdf-autotable";

import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getReporteEvento,
  getReporteGlobal,
} from "@/modules/reportes/services/reporte.service";

const BRAND = "EventCorpApp";
const MARGIN = 14;
const PRIMARY: [number, number, number] = [79, 70, 229];
const HEADER_TEXT: [number, number, number] = [255, 255, 255];

export type ExportFile = { buffer: Buffer; filename: string };

function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "_");
}

/** Reemplaza símbolos fuera de WinAnsi para que el texto se vea limpio. */
function pdfText(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/[—–]/g, "-")
    .replace(/[→←↔]/g, "-")
    .replace(/…/g, "...");
}

function newLetterDoc(): jsPDF {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
}

function drawDocHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30);
  doc.text(pdfText(title), MARGIN, 16);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(BRAND, pageWidth - MARGIN, 12, { align: "right" });
  doc.text(
    pdfText(`Emitido: ${formatDateTime(new Date())}`),
    pageWidth - MARGIN,
    17,
    { align: "right" },
  );

  let y = 23;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(pdfText(subtitle), MARGIN, y);
    y += 6;
  }
  return y;
}

function drawPageFooters(doc: jsPDF, label: string) {
  const total = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(
      pdfText(`${BRAND} - ${label} - Pagina ${i} de ${total}`),
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
  }
}

function lastTableY(doc: jsPDF, fallback: number): number {
  const table = (
    doc as unknown as {
      getLastAutoTable?: () => { finalY?: number } | null;
    }
  ).getLastAutoTable?.();
  return table?.finalY ?? fallback;
}

function tableOptions(
  startY: number,
  head: string[],
  body: (string | number)[][],
  extra: Partial<UserOptions> = {},
): UserOptions {
  return {
    startY,
    head: [head.map(pdfText)],
    body: body.map((row) => row.map(pdfText)),
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 1.6, textColor: 40 },
    headStyles: {
      fillColor: PRIMARY,
      textColor: HEADER_TEXT,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [246, 246, 252] },
    ...extra,
  };
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(pdfText(text), MARGIN, y);
  return y + 2;
}

function pdfBuffer(doc: jsPDF): Buffer {
  return Buffer.from(doc.output("arraybuffer"));
}

function styleSheetColumns(sheet: ExcelJS.Worksheet, width: number) {
  sheet.columns.forEach((col) => {
    col.width = width;
  });
}

export async function buildEventoReporteExcel(
  eventoId: string,
): Promise<ExportFile> {
  const r = await getReporteEvento(eventoId);

  const participantes = await prisma.eventoParticipante.findMany({
    where: { eventoId },
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
          zona: true,
          clasificacion: true,
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
  styleSheetColumns(resumenSheet, 26);

  // Hoja 2: Sorteos
  const sorteosSheet = wb.addWorksheet("Sorteos");
  const sorHeader = sorteosSheet.addRow([
    "Nombre",
    "Estado",
    "Ganadores",
    "Reglas",
    "Ejecuciones",
    "Ejecutado",
    "Ejecutado por",
  ]);
  sorHeader.font = { bold: true };
  for (const s of r.sorteos) {
    sorteosSheet.addRow([
      s.nombre,
      s.estado,
      s.cantidadGanadores,
      s.reglas,
      s.ejecuciones,
      s.ejecutadoAt ? formatDateTime(s.ejecutadoAt) : "",
      s.ejecutadoPor ?? "",
    ]);
  }
  styleSheetColumns(sorteosSheet, 26);

  // Hoja 3: Ganadores
  const ganadoresSheet = wb.addWorksheet("Ganadores");
  const ganHeader = ganadoresSheet.addRow([
    "Empleado",
    "Código",
    "Puesto",
    "Departamento",
    "Zona",
    "Clasificación",
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
      g.zona ?? "",
      g.clasificacion ?? "",
      g.empresa,
      g.sorteo,
      formatDateTime(g.creadoAt),
    ]);
  }
  styleSheetColumns(ganadoresSheet, 24);

  // Hoja 4: Participantes y Asistencia
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
    "Zona",
    "Clasificación",
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
      emp.zona ?? "",
      emp.clasificacion ?? "",
      emp.empresa.nombre,
      p.asistencia ? "Sí" : "No",
      p.asistencia ? formatDateTime(p.asistencia.registradoAt) : "",
      p.participaSorteos ? "Sí" : "No",
      p.exclusionMotivo ?? "",
    ]);
  }
  styleSheetColumns(partSheet, 22);

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return {
    buffer,
    filename: `reporte-${safeFilename(r.evento.codigo)}.xlsx`,
  };
}

export async function buildEventoReportePdf(
  eventoId: string,
): Promise<ExportFile> {
  const r = await getReporteEvento(eventoId);
  const doc = newLetterDoc();

  let y = drawDocHeader(
    doc,
    "Reporte de Evento",
    pdfText(r.evento.nombre),
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    pdfText(
      `Codigo: ${r.evento.codigo}   Estado: ${r.evento.estado}` +
        (r.evento.ubicacion ? `   Ubicacion: ${r.evento.ubicacion}` : ""),
    ),
    MARGIN,
    y,
  );
  y += 5;
  doc.text(
    pdfText(
      `Fechas: ${formatDateTime(r.evento.fechaInicio)} - ${formatDateTime(r.evento.fechaFin)}`,
    ),
    MARGIN,
    y,
  );
  y += 8;

  autoTable(
    doc,
    tableOptions(
      y,
      [
        "Empresas",
        "Participantes",
        "Asistencias",
        "Elegibles",
        "Sorteos",
        "Ganadores",
      ],
      [
        [
          r.totales.empresas,
          r.totales.participantes,
          r.totales.asistencias,
          r.totales.elegibles,
          r.totales.sorteos,
          r.totales.ganadores,
        ],
      ],
      { styles: { fontSize: 9, cellPadding: 2, halign: "center" } },
    ),
  );
  y = lastTableY(doc, y) + 8;

  y = sectionTitle(doc, "Empresas participantes", y);
  autoTable(
    doc,
    tableOptions(
      y,
      ["Empresa", "Codigo", "Participantes", "Asistencias"],
      r.empresas.map((e) => [
        e.nombre,
        e.codigo,
        e.participantes,
        e.asistencias,
      ]),
    ),
  );
  y = lastTableY(doc, y) + 8;

  y = sectionTitle(doc, "Sorteos", y);
  autoTable(
    doc,
    tableOptions(
      y,
      ["Nombre", "Estado", "Ganadores", "Reglas", "Ejecuciones", "Ejecutado"],
      r.sorteos.map((s) => [
        s.nombre,
        s.estado,
        s.cantidadGanadores,
        s.reglas,
        s.ejecuciones,
        s.ejecutadoAt ? formatDateTime(s.ejecutadoAt) : "-",
      ]),
    ),
  );
  y = lastTableY(doc, y) + 8;

  sectionTitle(doc, "Acta de Ganadores", y);
  autoTable(
    doc,
    tableOptions(
      y,
      ["Empleado", "Codigo", "Puesto", "Departamento", "Empresa", "Sorteo"],
      r.ganadores.map((g) => [
        g.empleado,
        g.codigoEmpleado,
        g.puesto ?? "-",
        g.departamento ?? "-",
        g.empresa,
        g.sorteo,
      ]),
    ),
  );

  drawPageFooters(doc, `Reporte ${r.evento.codigo}`);
  return {
    buffer: pdfBuffer(doc),
    filename: `reporte-${safeFilename(r.evento.codigo)}.pdf`,
  };
}

export async function buildGlobalReporteExcel(): Promise<ExportFile> {
  const r = await getReporteGlobal();
  const estados = r.totales.eventosPorEstado as Record<string, number>;

  const wb = new ExcelJS.Workbook();

  const resumenSheet = wb.addWorksheet("Resumen Global");
  resumenSheet.addRow(["Reporte Global", BRAND]).font = { bold: true, size: 13 };
  resumenSheet.addRow(["Emitido", formatDateTime(new Date())]);
  resumenSheet.addRow([]);

  const kpiHeader = resumenSheet.addRow(["Indicador", "Total"]);
  kpiHeader.font = { bold: true };
  resumenSheet.addRow(["Empresas", r.totales.empresas]);
  resumenSheet.addRow(["Empleados", r.totales.empleados]);
  resumenSheet.addRow(["Empleados activos", r.totales.empleadosActivos]);
  resumenSheet.addRow(["Eventos", r.totales.eventos]);
  resumenSheet.addRow(["Sorteos finalizados", r.totales.sorteosFinalizados]);
  resumenSheet.addRow(["Ganadores adjudicados", r.totales.ganadores]);
  resumenSheet.addRow([]);

  const estadosHeader = resumenSheet.addRow(["Estado de evento", "Cantidad"]);
  estadosHeader.font = { bold: true };
  for (const estado of ["BORRADOR", "ACTIVO", "FINALIZADO", "CANCELADO"]) {
    resumenSheet.addRow([estado, estados[estado] ?? 0]);
  }
  styleSheetColumns(resumenSheet, 28);

  const eventosSheet = wb.addWorksheet("Eventos");
  const evHeader = eventosSheet.addRow([
    "Evento",
    "Código",
    "Estado",
    "Inicio",
    "Empresas",
    "Participantes",
    "Asistencias",
    "Sorteos",
    "Ganadores",
  ]);
  evHeader.font = { bold: true };
  for (const e of r.eventos) {
    eventosSheet.addRow([
      e.nombre,
      e.codigo,
      e.estado,
      formatDateTime(e.fechaInicio),
      e.empresas,
      e.participantes,
      e.asistencias,
      e.sorteos,
      e.ganadores,
    ]);
  }
  styleSheetColumns(eventosSheet, 24);

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, filename: "reporte-global.xlsx" };
}

export async function buildGlobalReportePdf(): Promise<ExportFile> {
  const r = await getReporteGlobal();
  const estados = r.totales.eventosPorEstado as Record<string, number>;

  const doc = newLetterDoc();
  let y = drawDocHeader(doc, "Reporte Global", "Resumen de la plataforma");

  autoTable(
    doc,
    tableOptions(
      y,
      [
        "Empresas",
        "Empleados",
        "Eventos",
        "Sorteos finalizados",
        "Ganadores",
      ],
      [
        [
          r.totales.empresas,
          `${r.totales.empleadosActivos}/${r.totales.empleados}`,
          r.totales.eventos,
          r.totales.sorteosFinalizados,
          r.totales.ganadores,
        ],
      ],
      { styles: { fontSize: 9, cellPadding: 2, halign: "center" } },
    ),
  );
  y = lastTableY(doc, y) + 8;

  y = sectionTitle(doc, "Eventos por estado", y);
  autoTable(
    doc,
    tableOptions(
      y,
      ["Estado", "Cantidad"],
      ["BORRADOR", "ACTIVO", "FINALIZADO", "CANCELADO"].map((e) => [
        e,
        estados[e] ?? 0,
      ]),
      { tableWidth: 80 },
    ),
  );
  y = lastTableY(doc, y) + 8;

  sectionTitle(doc, "Eventos", y);
  autoTable(
    doc,
    tableOptions(
      y,
      [
        "Evento",
        "Estado",
        "Inicio",
        "Emp.",
        "Part.",
        "Asist.",
        "Sorteos",
        "Gan.",
      ],
      r.eventos.map((e) => [
        e.nombre,
        e.estado,
        formatDateTime(e.fechaInicio),
        e.empresas,
        e.participantes,
        e.asistencias,
        e.sorteos,
        e.ganadores,
      ]),
    ),
  );

  drawPageFooters(doc, "Reporte Global");
  return { buffer: pdfBuffer(doc), filename: "reporte-global.pdf" };
}
