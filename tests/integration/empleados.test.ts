import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  createEmpleado,
  updateEmpleado,
} from "@/modules/empleados/services/empleado.service";
import { createEmpresa } from "@/modules/empresas/services/empresa.service";
import { cleanDatabase } from "./helpers";

const EMPRESA = { codigo: "ACME", nombre: "Acme", clasificacion: null, ubicacion: null };
const OTRA = { codigo: "BETA", nombre: "Beta", clasificacion: null, ubicacion: null };

function empleadoInput(empresaId: string, overrides = {}) {
  return {
    empresaId,
    codigo: "E001",
    identificacion: null,
    nombres: "Ana",
    apellidos: "Pérez",
    correo: "ana@example.com",
    departamento: "VENTAS",
    puesto: "Ejecutiva",
    claseNomina: "MENSUAL",
    fechaIngreso: new Date("2020-01-15"),
    ...overrides,
  };
}

describe("empleados service", () => {
  beforeEach(cleanDatabase);

  it("crea un empleado ligado a una empresa existente", async () => {
    const empresa = await createEmpresa(EMPRESA);
    const empleado = await createEmpleado(empleadoInput(empresa.id));
    expect(empleado.empresaId).toBe(empresa.id);
    expect(empleado.activo).toBe(true);
  });

  it("rechaza empresaId inexistente", async () => {
    await expect(
      createEmpleado(empleadoInput("3f8a2c1e-7b4d-4e2f-9a1b-0c3d5e6f7a8b")),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("permite el mismo código de empleado en empresas distintas", async () => {
    const acme = await createEmpresa(EMPRESA);
    const beta = await createEmpresa(OTRA);
    await createEmpleado(empleadoInput(acme.id));
    const segundo = await createEmpleado(
      empleadoInput(beta.id, { correo: "ana2@example.com" }),
    );
    expect(segundo.codigo).toBe("E001");
  });

  it("rechaza código duplicado dentro de la misma empresa", async () => {
    const acme = await createEmpresa(EMPRESA);
    await createEmpleado(empleadoInput(acme.id));
    await expect(
      createEmpleado(empleadoInput(acme.id, { correo: "otro@example.com" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rechaza correo duplicado globalmente", async () => {
    const acme = await createEmpresa(EMPRESA);
    const beta = await createEmpresa(OTRA);
    await createEmpleado(empleadoInput(acme.id));
    await expect(
      createEmpleado(empleadoInput(beta.id, { codigo: "E999" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("permite identificación nula pero única cuando se define", async () => {
    const acme = await createEmpresa(EMPRESA);
    await createEmpleado(empleadoInput(acme.id, { identificacion: "ID-1", correo: "a@x.com" }));
    await createEmpleado(
      empleadoInput(acme.id, { codigo: "E2", correo: "b@x.com", identificacion: null }),
    );
    await expect(
      createEmpleado(
        empleadoInput(acme.id, { codigo: "E3", correo: "c@x.com", identificacion: "ID-1" }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("desactivar un empleado no afecta a la empresa", async () => {
    const acme = await createEmpresa(EMPRESA);
    const empleado = await createEmpleado(empleadoInput(acme.id));
    const inactivo = await updateEmpleado(empleado.id, { activo: false });
    expect(inactivo.activo).toBe(false);

    const empresa = await prisma.empresa.findUnique({ where: { id: acme.id } });
    expect(empresa?.activo).toBe(true);
  });
});
