import { describe, expect, it } from "vitest";

import {
  getCampoDef,
  OPERADORES_POR_TIPO,
  validateReglaValor,
} from "@/modules/sorteos/lib/reglas-catalogo";
import { reglaSchema } from "@/modules/sorteos/schemas/sorteo.schema";
import { reglaToWhere } from "@/modules/sorteos/services/sorteo.service";

const REGLA = {
  entidad: "EMPLEADO" as const,
  campo: "departamento",
  operador: "IGUAL" as const,
  valor: "VENTAS",
};

describe("catálogo de reglas", () => {
  it("solo permite campos del catálogo", () => {
    expect(getCampoDef("EMPLEADO", "departamento")?.tipo).toBe("texto");
    expect(getCampoDef("EMPRESA", "clasificacion")?.tipo).toBe("texto");
    expect(getCampoDef("EMPLEADO", "salario")).toBeNull();
    expect(getCampoDef("EMPRESA", "nombres")).toBeNull();
  });

  it("solo permite operadores del tipo del campo", () => {
    expect(OPERADORES_POR_TIPO.texto).toContain("CONTIENE");
    expect(OPERADORES_POR_TIPO.booleano).not.toContain("CONTIENE");
    expect(OPERADORES_POR_TIPO.fecha).toContain("ANTES_DE");
    expect(OPERADORES_POR_TIPO.texto).not.toContain("ANTES_DE");
  });

  it("valida valores por tipo", () => {
    expect(validateReglaValor({ tipo: "booleano", label: "" }, "true")).toBeNull();
    expect(
      validateReglaValor({ tipo: "booleano", label: "" }, "quizá"),
    ).not.toBeNull();
    expect(
      validateReglaValor({ tipo: "fecha", label: "" }, "2026-01-01"),
    ).toBeNull();
    expect(
      validateReglaValor({ tipo: "fecha", label: "" }, "ayer"),
    ).not.toBeNull();
    expect(
      validateReglaValor({ tipo: "texto", label: "" }, "X".repeat(301)),
    ).not.toBeNull();
    expect(
      validateReglaValor({ tipo: "meses", label: "" }, "6"),
    ).toBeNull();
    expect(
      validateReglaValor({ tipo: "meses", label: "" }, "0"),
    ).not.toBeNull();
  });
});

describe("reglaSchema", () => {
  it("acepta una regla válida", () => {
    expect(reglaSchema.safeParse(REGLA).success).toBe(true);
  });

  it("rechaza campo fuera del catálogo", () => {
    const res = reglaSchema.safeParse({ ...REGLA, campo: "salario" });
    expect(res.success).toBe(false);
  });

  it("rechaza operador inválido para el tipo", () => {
    const res = reglaSchema.safeParse({
      entidad: "EMPLEADO",
      campo: "activo",
      operador: "CONTIENE",
      valor: "true",
    });
    expect(res.success).toBe(false);
  });

  it("rechaza valor incoherente con el tipo", () => {
    const res = reglaSchema.safeParse({
      entidad: "EMPLEADO",
      campo: "fechaIngreso",
      operador: "ANTES_DE",
      valor: "no-es-fecha",
    });
    expect(res.success).toBe(false);
  });
});

describe("reglaToWhere", () => {
  it("mapea regla de empleado texto IGUAL", () => {
    expect(reglaToWhere(REGLA)).toEqual({
      empleado: { departamento: { equals: "VENTAS", mode: "insensitive" } },
    });
  });

  it("mapea regla de empresa CONTIENE", () => {
    expect(
      reglaToWhere({
        entidad: "EMPRESA",
        campo: "clasificacion",
        operador: "CONTIENE",
        valor: "GRUPO",
      }),
    ).toEqual({
      empleado: {
        empresa: { clasificacion: { contains: "GRUPO", mode: "insensitive" } },
      },
    });
  });

  it("mapea booleano a equals", () => {
    expect(
      reglaToWhere({
        entidad: "EMPLEADO",
        campo: "activo",
        operador: "IGUAL",
        valor: "true",
      }),
    ).toEqual({ empleado: { activo: { equals: true } } });
  });

  it("mapea fecha ANTES_DE a lt", () => {
    const where = reglaToWhere({
      entidad: "EMPLEADO",
      campo: "fechaIngreso",
      operador: "ANTES_DE",
      valor: "2020-01-01",
    }) as { empleado: { fechaIngreso: { lt: Date } } };
    expect(where.empleado.fechaIngreso.lt).toEqual(new Date("2020-01-01"));
  });

  it("mapea antiguedadMeses DESPUES_DE (>= N meses) a fechaIngreso.lte", () => {
    const where = reglaToWhere({
      entidad: "EMPLEADO",
      campo: "antiguedadMeses",
      operador: "DESPUES_DE",
      valor: "6",
    }) as { empleado: { fechaIngreso: { lte: Date } } };
    expect(where.empleado.fechaIngreso.lte).toBeInstanceOf(Date);
    expect(where.empleado.fechaIngreso.lte.getTime()).toBeLessThan(Date.now());
  });

  it("rechaza campo no catalogado", () => {
    expect(() =>
      reglaToWhere({
        entidad: "EMPLEADO",
        campo: "password",
        operador: "IGUAL",
        valor: "x",
      }),
    ).toThrow();
  });
});
