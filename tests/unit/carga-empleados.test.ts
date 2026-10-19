import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";

import {
  cellToValue,
  extraerFilas,
  normalizarEncabezado,
  parseFechaCarga,
  serialExcelADate,
} from "@/modules/empleados/lib/carga-columns";

describe("normalizarEncabezado", () => {
  it("normaliza acentos, mayúsculas y separadores", () => {
    expect(normalizarEncabezado("Fecha de Ingreso")).toBe("fechadeingreso");
    expect(normalizarEncabezado("FECHA_INGRESO")).toBe("fechaingreso");
    expect(normalizarEncabezado("Clasificación")).toBe("clasificacion");
    expect(normalizarEncabezado(" CÓDIGO ")).toBe("codigo");
  });
});

describe("cellToValue", () => {
  it("devuelve null para celdas vacías", () => {
    expect(cellToValue(null)).toBeNull();
    expect(cellToValue(undefined)).toBeNull();
    expect(cellToValue("   ")).toBeNull();
  });

  it("convierte primitivos a string", () => {
    expect(cellToValue("ABC")).toBe("ABC");
    expect(cellToValue(45000)).toBe("45000");
    expect(cellToValue(true)).toBe("true");
  });

  it("extrae texto de richText y hyperlinks", () => {
    expect(
      cellToValue({
        richText: [{ text: "Hola " }, { text: "Mundo" }],
      } as never),
    ).toBe("Hola Mundo");
    expect(
      cellToValue({ text: "enlace", hyperlink: "http://x" } as never),
    ).toBe("enlace");
  });

  it("conserva objetos Date", () => {
    const d = new Date("2020-01-15T00:00:00Z");
    expect(cellToValue(d)).toBe(d);
  });
});

describe("serialExcelADate", () => {
  it("convierte serial 43831 a 2020-01-01", () => {
    expect(serialExcelADate(43831).toISOString().slice(0, 10)).toBe(
      "2020-01-01",
    );
  });
});

describe("parseFechaCarga", () => {
  const iso = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : v;

  it("acepta formatos día-primero es-ES", () => {
    expect(iso(parseFechaCarga("15/01/2020"))).toBe("2020-01-15");
    expect(iso(parseFechaCarga("15-01-2020"))).toBe("2020-01-15");
    expect(iso(parseFechaCarga("01.01.2020"))).toBe("2020-01-01");
    expect(iso(parseFechaCarga("5/3/2020"))).toBe("2020-03-05");
  });

  it("convierte serial Excel como string", () => {
    expect(iso(parseFechaCarga("43831"))).toBe("2020-01-01");
  });

  it("conserva Date y deja ISO para Zod", () => {
    const d = new Date("2020-01-15T00:00:00Z");
    expect(parseFechaCarga(d)).toBe(d);
    expect(parseFechaCarga("2020-01-15")).toBe("2020-01-15");
    expect(parseFechaCarga(undefined)).toBeUndefined();
  });
});

describe("extraerFilas", () => {
  function buildSheet(rows: (string | Date | number | null)[][]) {
    const wb = new Workbook();
    const ws = wb.addWorksheet("empleados");
    for (const r of rows) ws.addRow(r);
    return ws;
  }

  const headers = [
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

  it("extrae filas de datos mapeando encabezados", () => {
    const ws = buildSheet([
      headers,
      ["E1", null, "Ana", "López", "a@x.com", null, null, null, null, 43831],
      ["E2", null, "Luis", "Díaz", "b@x.com", null, null, null, null, 43832],
    ]);
    const r = extraerFilas(ws);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas).toHaveLength(2);
    expect(r.filas[0]?.fila).toBe(2);
    expect(r.filas[0]?.valores.codigo).toBe("E1");
    expect(r.filas[0]?.valores.fechaIngreso).toBe("43831");
  });

  it("omite filas completamente vacías", () => {
    const ws = buildSheet([
      headers,
      ["E1", null, "Ana", "López", "a@x.com", null, null, null, null, 43831],
      [null, null, null, null, null, null, null, null, null, null],
      ["E2", null, "Luis", "Díaz", "b@x.com", null, null, null, null, 43832],
    ]);
    const r = extraerFilas(ws);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas).toHaveLength(2);
    expect(r.filas[1]?.fila).toBe(4);
  });

  it("reporta columnas obligatorias faltantes", () => {
    const ws = buildSheet([
      ["codigo", "nombres"],
      ["E1", "Ana"],
    ]);
    const r = extraerFilas(ws);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.faltantes).toEqual(
      expect.arrayContaining(["apellidos", "fechaIngreso"]),
    );
    expect(r.faltantes).not.toContain("correo");
  });

  it("mapea la columna celular a telefono", () => {
    const ws = buildSheet([
      ["codigo", "nombres", "apellidos", "fecha_ingreso", "celular"],
      ["E1", "Ana", "López", 43831, "809-555-0000"],
    ]);
    const r = extraerFilas(ws);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas[0]?.valores.telefono).toBe("809-555-0000");
  });
});
