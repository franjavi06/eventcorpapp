import { beforeEach, describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { FilaCarga } from "@/modules/empleados/lib/carga-columns";
import { importEmpleados } from "@/modules/empleados/services/carga.service";
import { createEmpresa } from "@/modules/empresas/services/empresa.service";
import { cleanDatabase } from "./helpers";

let empresaId: string;

function fila(n: number, valores: FilaCarga["valores"]): FilaCarga {
  return { fila: n, valores };
}

const base = (suf: string): FilaCarga["valores"] => ({
  codigo: `COD-${suf}`,
  nombres: "Nombre",
  apellidos: `Apellido ${suf}`,
  correo: `e${suf}@test.dev`,
  fechaIngreso: new Date("2020-01-15"),
});

describe("importEmpleados", () => {
  beforeEach(async () => {
    await cleanDatabase();
    const empresa = await createEmpresa({
      codigo: "ACME",
      nombre: "Acme",
      clasificacion: null,
      ubicacion: null,
    });
    empresaId = empresa.id;
  });

  it("importa todas las filas válidas", async () => {
    const r = await importEmpleados(empresaId, [
      fila(2, base("A")),
      fila(3, base("B")),
      fila(4, base("C")),
    ]);
    expect(r.importados).toBe(3);
    expect(r.errores).toHaveLength(0);
    expect(
      await prisma.empleado.count({ where: { empresaId } }),
    ).toBe(3);
  });

  it("importación parcial: válidas entran, inválidas se reportan", async () => {
    const r = await importEmpleados(empresaId, [
      fila(2, base("A")),
      fila(3, { ...base("B"), correo: "no-es-email" }),
      fila(4, base("C")),
    ]);
    expect(r.importados).toBe(2);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]?.fila).toBe(3);
    expect(r.errores[0]?.campo).toBe("correo");
  });

  it("detecta duplicados dentro del archivo por código y correo", async () => {
    const r = await importEmpleados(empresaId, [
      fila(2, base("A")),
      fila(3, { ...base("X"), codigo: "COD-A" }),
      fila(4, { ...base("Y"), correo: "ea@test.dev" }),
    ]);
    expect(r.importados).toBe(1);
    expect(r.errores).toHaveLength(2);
    expect(r.errores.map((e) => e.fila)).toEqual([3, 4]);
  });

  it("reporta conflicto con datos existentes en la base", async () => {
    await importEmpleados(empresaId, [fila(2, base("A"))]);
    const r = await importEmpleados(empresaId, [
      fila(2, base("A")),
      fila(3, base("B")),
    ]);
    expect(r.importados).toBe(1);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]?.fila).toBe(2);
    expect(r.errores[0]?.mensaje).toMatch(/ya existen/i);
  });

  it("rechaza empresa inexistente", async () => {
    await expect(
      importEmpleados("3f8a2c1e-7b4d-4e2f-9a1b-0c3d5e6f7a8b", [fila(2, base("A"))]),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rechaza archivo sin filas o que supera el máximo", async () => {
    await expect(importEmpleados(empresaId, [])).rejects.toBeInstanceOf(
      ValidationError,
    );
    const muchas = Array.from({ length: 1001 }, (_, i) =>
      fila(i + 2, base(String(i))),
    );
    await expect(importEmpleados(empresaId, muchas)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("convierte seriales de fecha Excel a Date", async () => {
    const r = await importEmpleados(empresaId, [
      fila(2, { ...base("A"), fechaIngreso: "43831" }),
    ]);
    expect(r.importados).toBe(1);
    const emp = await prisma.empleado.findFirst({
      where: { empresaId, codigo: "COD-A" },
    });
    expect(emp?.fechaIngreso.toISOString().slice(0, 10)).toBe("2020-01-01");
  });

  it("acepta fecha día/mes/año (formato es-ES)", async () => {
    const r = await importEmpleados(empresaId, [
      fila(2, { ...base("A"), fechaIngreso: "15/01/2020" }),
    ]);
    expect(r.importados).toBe(1);
    const emp = await prisma.empleado.findFirst({
      where: { empresaId, codigo: "COD-A" },
    });
    expect(emp?.fechaIngreso.toISOString().slice(0, 10)).toBe("2020-01-15");
  });
});
