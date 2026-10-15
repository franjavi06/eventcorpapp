import type { ReglaEntidad, ReglaOperador } from "@/generated/prisma/enums";

export type CampoTipo = "texto" | "booleano" | "fecha";

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
    codigo: { tipo: "texto", label: "Código" },
    departamento: { tipo: "texto", label: "Departamento" },
    puesto: { tipo: "texto", label: "Puesto" },
    zona: { tipo: "texto", label: "Zona" },
    clasificacion: { tipo: "texto", label: "Clasificación" },
    activo: { tipo: "booleano", label: "Activo" },
    fechaIngreso: { tipo: "fecha", label: "Fecha de ingreso" },
  },
} as const;

export const OPERADORES_POR_TIPO: Record<CampoTipo, readonly ReglaOperador[]> = {
  texto: ["IGUAL", "DISTINTO", "CONTIENE"],
  booleano: ["IGUAL"],
  fecha: ["IGUAL", "ANTES_DE", "DESPUES_DE"],
} as const;

export const OPERADOR_LABELS: Record<ReglaOperador, string> = {
  IGUAL: "es igual a",
  DISTINTO: "es distinto de",
  CONTIENE: "contiene",
  ANTES_DE: "antes de",
  DESPUES_DE: "después de",
};

export function getCampoDef(
  entidad: ReglaEntidad,
  campo: string,
): CampoDef | null {
  return REGLAS_CATALOGO[entidad]?.[campo] ?? null;
}

/** Valida que el valor serializado sea correcto para el tipo del campo. */
export function validateReglaValor(campo: CampoDef, valor: string): string | null {
  const v = valor.trim();
  if (!v) return "El valor es obligatorio";
  switch (campo.tipo) {
    case "booleano":
      return v === "true" || v === "false"
        ? null
        : "El valor debe ser verdadero o falso";
    case "fecha":
      return Number.isNaN(Date.parse(v)) ? "Fecha inválida" : null;
    default:
      return v.length <= 300 ? null : "El valor es demasiado largo";
  }
}
