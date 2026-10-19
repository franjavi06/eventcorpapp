import { z } from "zod";

import { paginationSchema, uuidSchema } from "@/lib/validations/common";

export const participanteCreateSchema = z.object({
  empleadoId: uuidSchema,
});

export const asistenciaCreateSchema = z
  .object({
    empleadoId: uuidSchema.optional(),
    codigo: z.string().trim().min(1).max(20).optional(),
  })
  .refine((v) => v.empleadoId || v.codigo, {
    message: "Indique empleadoId o codigo",
  });

export const exclusionSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "El motivo de exclusión es obligatorio")
    .max(300),
  responsable: z
    .string()
    .trim()
    .max(150)
    .nullish()
    .transform((v) => v || null),
});

export const PARTICIPANTE_ASISTENCIA_FILTROS = ["all", "si", "no"] as const;
export const PARTICIPANTE_SORTEOS_FILTROS = [
  "all",
  "elegibles",
  "excluidos",
] as const;

export const participanteListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  empresaId: uuidSchema.optional(),
  asistencia: z.enum(PARTICIPANTE_ASISTENCIA_FILTROS).default("all"),
  sorteos: z.enum(PARTICIPANTE_SORTEOS_FILTROS).default("all"),
});

export type ParticipanteListQuery = z.output<typeof participanteListQuerySchema>;
export type ExclusionInput = z.output<typeof exclusionSchema>;
