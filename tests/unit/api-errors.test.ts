import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fail, handleApiError, ok, parseJson } from "@/lib/api";
import { BadRequestError, NotFoundError, ValidationError } from "@/lib/errors";

describe("ok", () => {
  it("envuelve el payload en { data }", async () => {
    const res = ok({ hola: "mundo" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { hola: "mundo" } });
  });
});

describe("fail", () => {
  it("produce la forma uniforme de error", async () => {
    const res = fail("CONFLICT", "duplicado", 409);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "CONFLICT", message: "duplicado" },
    });
  });
});

describe("handleApiError", () => {
  it("mapea ZodError a 400 VALIDATION", async () => {
    const schema = z.object({ nombre: z.string().min(1) });
    const parsed = schema.safeParse({ nombre: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const res = handleApiError(parsed.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION");
  });

  it("mapea AppError a su status", async () => {
    const res = handleApiError(new NotFoundError("Empresa no encontrada"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatchObject({
      code: "NOT_FOUND",
      message: "Empresa no encontrada",
    });
  });

  it("mapea errores desconocidos a 500 sin filtrar detalles", async () => {
    const res = handleApiError(new Error("detalle interno sensible"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("detalle interno sensible");
  });
});

describe("parseJson", () => {
  const schema = z.object({ codigo: z.string().min(1) });

  it("devuelve el body validado", async () => {
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      body: JSON.stringify({ codigo: "ACME" }),
      headers: { "content-type": "application/json" },
    });
    await expect(parseJson(req, schema)).resolves.toEqual({ codigo: "ACME" });
  });

  it("lanza BadRequestError con JSON inválido", async () => {
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      body: "no-json{",
    });
    await expect(parseJson(req, schema)).rejects.toBeInstanceOf(BadRequestError);
  });

  it("lanza ValidationError cuando el schema falla", async () => {
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      body: JSON.stringify({ codigo: "" }),
    });
    await expect(parseJson(req, schema)).rejects.toBeInstanceOf(ValidationError);
  });
});
