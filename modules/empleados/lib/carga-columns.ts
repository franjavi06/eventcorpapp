import type { CellValue, Worksheet } from "exceljs";

/** Campos aceptados en el archivo de carga masiva de empleados. */
export type CampoCarga =
  | "codigo"
  | "identificacion"
  | "nombres"
  | "apellidos"
  | "correo"
  | "departamento"
  | "puesto"
  | "zona"
  | "clasificacion"
  | "fechaIngreso";

const HEADER_TO_FIELD: Record<string, CampoCarga> = {
  codigo: "codigo",
  identificacion: "identificacion",
  nombres: "nombres",
  nombre: "nombres",
  apellidos: "apellidos",
  apellido: "apellidos",
  correo: "correo",
  email: "correo",
  departamento: "departamento",
  puesto: "puesto",
  zona: "zona",
  clasificacion: "clasificacion",
  fechaingreso: "fechaIngreso",
  fechadeingreso: "fechaIngreso",
};

/** minúsculas, sin acentos, sin separadores. "Fecha de Ingreso" → "fechaingreso". */
export function normalizarEncabezado(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Convierte un valor de celda exceljs a string, Date o null.
 * Maneja richText, hyperlink, fórmulas (usa `result`) y seriales Excel.
 */
export function cellToValue(cell: CellValue): string | Date | null {
  if (cell == null) return null;
  if (cell instanceof Date) return cell;
  if (typeof cell === "string") {
    const t = cell.trim();
    return t === "" ? null : t;
  }
  if (typeof cell === "number" || typeof cell === "boolean") {
    return String(cell);
  }
  if (typeof cell === "object") {
    const obj = cell as unknown as Record<string, unknown>;
    if (typeof obj.text === "string") return cellToValue(obj.text);
    if (Array.isArray(obj.richText)) {
      const text = (obj.richText as { text?: string }[])
        .map((r) => r.text ?? "")
        .join("");
      return cellToValue(text);
    }
    if ("result" in obj) return cellToValue(obj.result as CellValue);
    if (obj.error != null) return String(obj.error);
  }
  return String(cell);
}

export type FilaCarga = {
  /** Número de fila en el Excel (1 = encabezados). */
  fila: number;
  valores: Partial<Record<CampoCarga, string | Date>>;
};

export type ResultadoFilas =
  | { ok: true; filas: FilaCarga[] }
  | { ok: false; faltantes: string[] };

const REQUERIDAS: CampoCarga[] = [
  "codigo",
  "nombres",
  "apellidos",
  "correo",
  "fechaIngreso",
];

/**
 * Lee la primera hoja: fila 1 = encabezados, resto = datos.
 * Omite filas completamente vacías.
 */
export function extraerFilas(worksheet: Worksheet): ResultadoFilas {
  const headerRow = worksheet.getRow(1);
  const mapa = new Map<number, CampoCarga>();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const raw = cellToValue(cell.value);
    if (typeof raw !== "string") return;
    const campo = HEADER_TO_FIELD[normalizarEncabezado(raw)];
    if (campo && !mapa.has(colNumber)) mapa.set(colNumber, campo);
  });

  const encontrados = new Set(mapa.values());
  const faltantes = REQUERIDAS.filter((c) => !encontrados.has(c));
  if (faltantes.length > 0) return { ok: false, faltantes };

  const filas: FilaCarga[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const valores: FilaCarga["valores"] = {};
    let vacia = true;
    for (const [colNumber, campo] of mapa) {
      const v = cellToValue(row.getCell(colNumber).value);
      if (v !== null) {
        vacia = false;
        valores[campo] = v;
      }
    }
    if (!vacia) filas.push({ fila: rowNumber, valores });
  });
  return { ok: true, filas };
}

/** Convierte un serial numérico de fecha Excel a Date (UTC, días desde 1899-12-30). */
export function serialExcelADate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}
