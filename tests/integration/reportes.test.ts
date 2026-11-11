import { beforeEach, describe, expect, it } from "vitest";

import ExcelJS from "exceljs";

import {
  createEmpleado,
} from "@/modules/empleados/services/empleado.service";
import { createEmpresa } from "@/modules/empresas/services/empresa.service";
import {
  addEmpresaToEvento,
  createEvento,
} from "@/modules/eventos/services/evento.service";
import { checkIn } from "@/modules/participantes/services/participante.service";
import {
  buildEventoReporteExcel,
  buildEventoReportePdf,
  buildGlobalReporteExcel,
  buildGlobalReportePdf,
} from "@/modules/reportes/services/reporte-export.service";
import { ejecutarSorteo } from "@/modules/sorteos/services/ejecucion.service";
import {
  createSorteo,
  updateSorteo,
} from "@/modules/sorteos/services/sorteo.service";
import { cleanDatabase } from "./helpers";

const EMPRESA = {
  codigo: "ACME",
  nombre: "Acme",
  clasificacion: null,
  ubicacion: null,
};

const EVENTO = {
  codigo: "EVT-1",
  nombre: "Evento Anual",
  descripcion: null,
  ubicacion: null,
  fechaInicio: new Date("2026-12-18T18:00:00Z"),
  fechaFin: new Date("2026-12-18T23:00:00Z"),
};

async function setupConGanador() {
  const empresa = await createEmpresa(EMPRESA);
  const evento = await createEvento(EVENTO);
  await addEmpresaToEvento(evento.id, { empresaId: empresa.id });
  for (let i = 1; i <= 3; i++) {
    const e = await createEmpleado({
      empresaId: empresa.id,
      codigo: `E-${i}`,
      identificacion: null,
      nombres: `Empleado${i}`,
      apellidos: "Test",
      correo: null,
      departamento: null,
      puesto: null,
      zona: null,
      clasificacion: null,
      fechaIngreso: new Date("2020-01-15"),
    });
    await checkIn(evento.id, { empleadoId: e.id });
  }
  const sorteo = await createSorteo(evento.id, {
    nombre: "Premio $500",
    descripcion: null,
    cantidadGanadores: 1,
    orden: 0,
    asistenciaObligatoria: true,
  });
  await updateSorteo(sorteo.id, { estado: "ACTIVO" });
  await ejecutarSorteo(sorteo.id);
  return { empresa, evento };
}

async function loadWorkbook(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(buffer).buffer as ArrayBuffer);
  return wb;
}

describe("exportación de reportes", () => {
  beforeEach(cleanDatabase);

  it("genera el Excel del evento con las 4 hojas esperadas", async () => {
    const { evento } = await setupConGanador();

    const { buffer, filename } = await buildEventoReporteExcel(evento.id);

    expect(filename).toBe("reporte-EVT-1.xlsx");
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    const wb = await loadWorkbook(buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Resumen",
      "Sorteos",
      "Ganadores",
      "Participantes",
    ]);

    const ganadores = wb.getWorksheet("Ganadores");
    expect(ganadores?.rowCount).toBeGreaterThan(1);

    const participantes = wb.getWorksheet("Participantes");
    expect(participantes?.rowCount).toBe(4); // encabezado + 3 empleados
  });

  it("genera el PDF del evento en formato válido", async () => {
    const { evento } = await setupConGanador();

    const { buffer, filename } = await buildEventoReportePdf(evento.id);

    expect(filename).toBe("reporte-EVT-1.pdf");
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.subarray(-6).toString()).toContain("%%EOF");
  });

  it("genera el Excel global con Resumen Global y Eventos", async () => {
    await setupConGanador();

    const { buffer, filename } = await buildGlobalReporteExcel();

    expect(filename).toBe("reporte-global.xlsx");
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    const wb = await loadWorkbook(buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Resumen Global",
      "Eventos",
    ]);
    expect(wb.getWorksheet("Eventos")?.rowCount).toBe(2);
  });

  it("genera el PDF global en formato válido aun sin datos", async () => {
    const { buffer, filename } = await buildGlobalReportePdf();

    expect(filename).toBe("reporte-global.pdf");
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.subarray(-6).toString()).toContain("%%EOF");
  });
});
