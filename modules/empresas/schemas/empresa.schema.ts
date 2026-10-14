import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const empresaCreateSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(1, "El código es obligatorio")
    .max(20)
    .transform((v) => v.toUpperCase()),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  clasificacion: optionalText(50),
  ubicacion: optionalText(200),
});

export const empresaUpdateSchema = empresaCreateSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const empresaListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  activo: z.enum(["true", "false", "all"]).default("all"),
});

export type EmpresaCreateInput = z.output<typeof empresaCreateSchema>;
export type EmpresaUpdateInput = z.output<typeof empresaUpdateSchema>;
export type EmpresaListQuery = z.output<typeof empresaListQuerySchema>;
