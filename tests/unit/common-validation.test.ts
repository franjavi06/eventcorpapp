import { describe, expect, it } from "vitest";

import {
  idParamSchema,
  paginationSchema,
  uuidSchema,
} from "@/lib/validations/common";

describe("uuidSchema", () => {
  it("acepta un UUID v4 válido", () => {
    const result = uuidSchema.safeParse("3f8a2c1e-7b4d-4e2f-9a1b-0c3d5e6f7a8b");
    expect(result.success).toBe(true);
  });

  it("rechaza cadenas que no son UUID", () => {
    expect(uuidSchema.safeParse("no-es-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("123").success).toBe(false);
  });
});

describe("idParamSchema", () => {
  it("rechaza parámetros de ruta no UUID", () => {
    expect(idParamSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("aplica valores por defecto", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("convierte strings de query params", () => {
    expect(paginationSchema.parse({ page: "2", pageSize: "50" })).toEqual({
      page: 2,
      pageSize: 50,
    });
  });

  it("rechaza valores fuera de rango", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationSchema.safeParse({ pageSize: 500 }).success).toBe(false);
  });
});
