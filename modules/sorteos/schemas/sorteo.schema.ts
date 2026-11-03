import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/lib/validations/common";
import {
  getCampoDef,
  OPERADORES_POR_TIPO,
  validateReglaValor,
} from "@/modules/sorteos/lib/reglas-catalogo";

export const SORTEO_ESTADOS = [
  "BORRADOR",
  "ACTIVO",
  "FINALIZADO",
  "CANCELADO",
] as const;

export const sorteoEstadoSchema = z.enum(SORTEO_ESTADOS);

export const MODOS_REVELACION = ["AUTOMATICO", "MANUAL"] as const;
export const modoRevelacionSchema = z.enum(MODOS_REVELACION);

export const reglaEntidadSchema = z.enum(["EMPRESA", "EMPLEADO"]);
export const reglaOperadorSchema = z.enum([
  "IGUAL",
  "DISTINTO",
  "CONTIENE",
  "ANTES_DE",
  "DESPUES_DE",
]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const sorteoBaseFields = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  descripcion: optionalText(500),
  cantidadGanadores: z.coerce
    .number()
    .int("La cantidad de ganadores debe ser un entero")
    .positive("La cantidad de ganadores debe ser mayor que cero"),
  orden: z.coerce.number().int().default(0),
  asistenciaObligatoria: z.boolean().default(true),
  modoRevelacion: modoRevelacionSchema.default("AUTOMATICO"),
  duracionAnimacionSegundos: z.coerce
    .number()
    .int("La duración debe ser un entero")
    .min(1, "Mínimo 1 segundo")
    .max(30, "Máximo 30 segundos")
    .default(3),
});

export const sorteoCreateSchema = sorteoBaseFields.extend({
  estado: sorteoEstadoSchema.default("BORRADOR"),
});

export const sorteoUpdateSchema = sorteoBaseFields.partial().extend({
  estado: sorteoEstadoSchema.optional(),
});

export const sorteoListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  estado: z.enum([...SORTEO_ESTADOS, "all"]).default("all"),
});

const reglaBaseSchema = z.object({
  entidad: reglaEntidadSchema,
  campo: z.string().trim().min(1).max(50),
  operador: reglaOperadorSchema,
  valor: z.string().trim().min(1, "El valor es obligatorio").max(300),
  orden: z.coerce.number().int().default(0),
  activo: z.boolean().default(true),
});

/** Regla validada contra el catálogo: campo existe, operador válido para su tipo, valor coherente. */
export const reglaSchema = reglaBaseSchema.superRefine((regla, ctx) => {
    const def = getCampoDef(regla.entidad, regla.campo);
    if (!def) {
      ctx.addIssue({
        code: "custom",
        path: ["campo"],
        message: `El campo "${regla.campo}" no está permitido para ${regla.entidad}`,
      });
      return;
    }
    if (!OPERADORES_POR_TIPO[def.tipo].includes(regla.operador)) {
      ctx.addIssue({
        code: "custom",
        path: ["operador"],
        message: `El operador ${regla.operador} no es válido para un campo de tipo ${def.tipo}`,
      });
      return;
    }
    const valorError = validateReglaValor(def, regla.valor);
    if (valorError) {
      ctx.addIssue({ code: "custom", path: ["valor"], message: valorError });
    }
  });

/**
 * Acepta cambios parciales; el servicio vuelve a validar la regla
 * completa (mezcla actual + cambios) contra `reglaSchema`.
 */
export const reglaUpdateSchema = reglaBaseSchema.partial();

export const sorteoIdParamsSchema = z.object({
  id: uuidSchema,
  sorteoId: uuidSchema,
});

export const reglaIdParamsSchema = sorteoIdParamsSchema.extend({
  reglaId: uuidSchema,
});

const cuotaBaseSchema = z.object({
  entidad: reglaEntidadSchema.default("EMPLEADO"),
  campo: z.string().trim().min(1).max(50),
  valor: z.string().trim().min(1, "El valor es obligatorio").max(300),
  cantidad: z.coerce
    .number()
    .int("La cantidad debe ser un entero")
    .positive("La cantidad debe ser mayor que cero"),
  orden: z.coerce.number().int().default(0),
  activo: z.boolean().default(true),
});

export const cuotaSchema = cuotaBaseSchema.superRefine((cuota, ctx) => {
  const def = getCampoDef(cuota.entidad, cuota.campo);
  if (!def || def.tipo !== "texto") {
    ctx.addIssue({
      code: "custom",
      path: ["campo"],
      message: `El campo "${cuota.campo}" no está permitido para cuotas de ${cuota.entidad}`,
    });
  }
});

export const cuotaUpdateSchema = cuotaBaseSchema.partial();

export const cuotaIdParamsSchema = sorteoIdParamsSchema.extend({
  cuotaId: uuidSchema,
});

export const sorteoCargaMasivaItemSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  cantidadGanadores: z.coerce
    .number()
    .int("La cantidad de ganadores debe ser un entero")
    .positive("La cantidad de ganadores debe ser mayor que cero"),
  descripcion: optionalText(500),
});

export const sorteoCargaMasivaSchema = z.object({
  items: z
    .array(sorteoCargaMasivaItemSchema)
    .min(1, "Debe incluir al menos un sorteo")
    .max(200, "Máximo 200 sorteos por carga"),
  estado: z.enum(["BORRADOR", "ACTIVO"]).default("BORRADOR"),
  asistenciaObligatoria: z.boolean().default(true),
  antiguedadMinimaMeses: z.coerce
    .number()
    .int()
    .min(1)
    .max(600)
    .nullish()
    .transform((v) => v ?? null),
});

export type SorteoCreateInput = z.output<typeof sorteoCreateSchema>;
export type SorteoUpdateInput = z.output<typeof sorteoUpdateSchema>;
export type SorteoListQuery = z.output<typeof sorteoListQuerySchema>;
export type ReglaInput = z.output<typeof reglaSchema>;
export type CuotaInput = z.output<typeof cuotaSchema>;
export type SorteoCargaMasivaInput = z.output<typeof sorteoCargaMasivaSchema>;
