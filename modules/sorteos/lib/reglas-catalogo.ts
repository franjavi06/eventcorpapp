import type { ReglaEntidad, ReglaOperador } from "@/generated/prisma/enums";

export type CampoTipo = "texto" | "booleano" | "fecha" | "meses";

export type CampoDef = {
  tipo: CampoTipo;
  label: string;
};

/**
 * Catálogo servidor de campos y operadores permitidos para las reglas AND.
 * El cliente solo puede elegir de esta lista; el servicio vuelve a validarla.
 * Es un módulo puro: se puede importar desde componentes cliente.
 */
export const REGLAS_CATALOGO: Record<ReglaEntidad, Record<string, CampoDef>> = {
  EMPRESA: {
    codigo: { tipo: "texto", label: "Código" },
    clasificacion: { tipo: "texto", label: "Clasificación" },
    ubicacion: { tipo: "texto", label: "Ubicación" },
    activo: { tipo: "booleano", label: "Activa" },
  },
  EMPLEADO: {
    antiguedadMeses: { tipo: "meses", label: "Antigüedad (meses)" },
    departamento: { tipo: "texto", label: "Departamento" },
    clasificacion: { tipo: "texto", label: "Clasificación" },
    zona: { tipo: "texto", label: "Zona" },
    puesto: { tipo: "texto", label: "Puesto" },
    codigo: { tipo: "texto", label: "Código" },
    activo: { tipo: "booleano", label: "Activo" },
    fechaIngreso: { tipo: "fecha", label: "Fecha de ingreso" },
  },
} as const;

export const OPERADORES_POR_TIPO: Record<CampoTipo, readonly ReglaOperador[]> = {
  texto: ["IGUAL", "DISTINTO", "CONTIENE"],
  booleano: ["IGUAL"],
  fecha: ["IGUAL", "ANTES_DE", "DESPUES_DE"],
  meses: ["DESPUES_DE", "ANTES_DE"],
} as const;

export const OPERADOR_LABELS: Record<ReglaOperador, string> = {
  IGUAL: "es igual a",
  DISTINTO: "es distinto de",
  CONTIENE: "contiene",
  ANTES_DE: "antes de",
  DESPUES_DE: "después de",
};

export function getOperadorLabel(
  tipo: CampoTipo | undefined,
  op: ReglaOperador,
): string {
  if (tipo === "meses") {
    return op === "DESPUES_DE" ? "mayor o igual a" : "menor a";
  }
  return OPERADOR_LABELS[op];
}

export function getCampoDef(
  entidad: ReglaEntidad,
  campo: string,
): CampoDef | null {
  return REGLAS_CATALOGO[entidad]?.[campo] ?? null;
}

/** Valida que el valor serializado sea correcto para el tipo del campo. */
export function validateReglaValor(
  campo: CampoDef,
  valor: string,
): string | null {
  const v = valor.trim();
  if (!v) return "El valor es obligatorio";
  switch (campo.tipo) {
    case "booleano":
      return v === "true" || v === "false"
        ? null
        : "El valor debe ser verdadero o falso";
    case "fecha":
      return Number.isNaN(Date.parse(v)) ? "Fecha inválida" : null;
    case "meses": {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 600
        ? null
        : "Ingrese una cantidad entera de meses (1 a 600)";
    }
    default:
      return v.length <= 300 ? null : "El valor es demasiado largo";
  }
}
