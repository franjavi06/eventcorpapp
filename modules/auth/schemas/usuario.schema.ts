import { z } from "zod";

export const ROLES_CODIGOS = [
  "ADMIN",
  "OPERADOR_SORTEOS",
  "OPERADOR_CHECKIN",
  "CONSULTA",
] as const;

export type RolCodigo = (typeof ROLES_CODIGOS)[number];

export const PERMISOS_CODIGOS = [
  "EMPRESAS_WRITE",
  "EMPLEADOS_WRITE",
  "EVENTOS_WRITE",
  "PARTICIPANTES_WRITE",
  "CHECKIN_WRITE",
  "SORTEOS_WRITE",
  "SORTEOS_EJECUTAR",
  "USUARIOS_MANAGE",
  "REPORTES_READ",
] as const;

export type PermisoCodigo = (typeof PERMISOS_CODIGOS)[number];

export const loginSchema = z.object({
  identificador: z
    .string()
    .trim()
    .min(1, "Ingrese su usuario o correo")
    .max(200),
  password: z.string().min(1, "Ingrese su contraseña").max(200),
});

export const usuarioCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(60)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "Solo letras, números, puntos, guiones y guiones bajos",
    )
    .toLowerCase(),
  correo: z
    .string()
    .trim()
    .max(200)
    .toLowerCase()
    .pipe(z.email("Correo inválido")),
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(200),
  roles: z
    .array(z.enum(ROLES_CODIGOS))
    .min(1, "Seleccione al menos un rol")
    .default(["CONSULTA"]),
});

export const usuarioUpdateSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150).optional(),
  correo: z
    .string()
    .trim()
    .max(200)
    .toLowerCase()
    .pipe(z.email("Correo inválido"))
    .optional(),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(200)
    .optional(),
  roles: z.array(z.enum(ROLES_CODIGOS)).min(1, "Seleccione al menos un rol").optional(),
  activo: z.boolean().optional(),
});

export type LoginInput = z.output<typeof loginSchema>;
export type UsuarioCreateInput = z.output<typeof usuarioCreateSchema>;
export type UsuarioUpdateInput = z.output<typeof usuarioUpdateSchema>;
