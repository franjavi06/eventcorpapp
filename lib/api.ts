import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { AppError, BadRequestError, ValidationError } from "@/lib/errors";

type ApiSuccess<T> = { data: T };
type ApiFailure = { error: { code: string; message: string; details?: unknown } };

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status });
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiFailure> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Punto único de traducción de errores a respuestas JSON de la API. */
export function handleApiError(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof ZodError) {
    return fail("VALIDATION", "Datos de entrada inválidos", 400, z.treeifyError(error));
  }
  if (error instanceof AppError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  console.error("[api] error no controlado:", error);
  return fail("INTERNAL", "Error interno del servidor", 500);
}

/** Lee y valida el body JSON de un Route Handler. */
export async function parseJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("El cuerpo de la petición no es JSON válido");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Datos de entrada inválidos", z.treeifyError(result.error));
  }
  return result.data;
}
