import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/lib/validations/common";

export const EVENTO_ESTADOS = [
  "BORRADOR",
  "ACTIVO",
  "FINALIZADO",
  "CANCELADO",
] as const;

export const eventoEstadoSchema = z.enum(EVENTO_ESTADOS);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const fechasCoherentes = <T extends { fechaInicio?: Date; fechaFin?: Date }>(
  v: T,
) => !v.fechaInicio || !v.fechaFin || v.fechaInicio <= v.fechaFin;

const fechasMsg = {
  message: "La fecha de inicio no puede ser posterior a la fecha de fin",
  path: ["fechaFin"],
};

const eventoBaseFields = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(20)
    .transform((v) => v.toUpperCase()),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  descripcion: optionalText(1000),
  ubicacion: optionalText(200),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
});

export const eventoCreateSchema = eventoBaseFields
  .extend({ estado: eventoEstadoSchema.default("BORRADOR") })
  .refine(fechasCoherentes, fechasMsg);

export const eventoUpdateSchema = eventoBaseFields
  .partial()
  .extend({ estado: eventoEstadoSchema.optional() })
  .refine(fechasCoherentes, fechasMsg);

export const eventoListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  estado: z.enum([...EVENTO_ESTADOS, "all"]).default("all"),
});

export const eventoEmpresaSchema = z.object({ empresaId: uuidSchema });

export type EventoCreateInput = z.output<typeof eventoCreateSchema>;
export type EventoUpdateInput = z.output<typeof eventoUpdateSchema>;
export type EventoListQuery = z.output<typeof eventoListQuerySchema>;
