import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/lib/validations/common";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const empleadoCreateSchema = z.object({
  empresaId: uuidSchema,
  codigo: z.string().trim().min(1, "El código es obligatorio").max(20),
  identificacion: optionalText(30),
  nombres: z.string().trim().min(1, "Los nombres son obligatorios").max(100),
  apellidos: z.string().trim().min(1, "Los apellidos son obligatorios").max(100),
  correo: z.string().trim().max(200).toLowerCase().pipe(z.email("Correo inválido")),
  departamento: optionalText(100),
  puesto: optionalText(100),
  zona: optionalText(100),
  clasificacion: optionalText(50),
  fechaIngreso: z.coerce.date(),
});

export const empleadoUpdateSchema = empleadoCreateSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const empleadoListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  empresaId: uuidSchema.optional(),
  activo: z.enum(["true", "false", "all"]).default("all"),
});

export type EmpleadoCreateInput = z.output<typeof empleadoCreateSchema>;
export type EmpleadoUpdateInput = z.output<typeof empleadoUpdateSchema>;
export type EmpleadoListQuery = z.output<typeof empleadoListQuerySchema>;
