import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  createEmpresa,
  getEmpresa,
  listEmpresas,
  updateEmpresa,
} from "@/modules/empresas/services/empresa.service";
import { cleanDatabase } from "./helpers";

const base = { codigo: "ACME", nombre: "Acme Corp" };

describe("empresas service", () => {
  beforeEach(cleanDatabase);

  it("crea una empresa y la normaliza a mayúsculas el código", async () => {
    const empresa = await createEmpresa({
      codigo: "acme",
      nombre: "Acme Corp",
      clasificacion: "GRUPO",
      ubicacion: null,
    });
    expect(empresa.codigo).toBe("ACME");
    expect(empresa.activo).toBe(true);
  });

  it("rechaza código duplicado con ConflictError", async () => {
    await createEmpresa({ ...base, clasificacion: null, ubicacion: null });
    await expect(
      createEmpresa({ codigo: "ACME", nombre: "Otra", clasificacion: null, ubicacion: null }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("getEmpresa lanza NotFoundError si no existe", async () => {
    await expect(
      getEmpresa("3f8a2c1e-7b4d-4e2f-9a1b-0c3d5e6f7a8b"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("desactivación lógica conserva el registro", async () => {
    const empresa = await createEmpresa({
      ...base,
      clasificacion: null,
      ubicacion: null,
    });
    const desactivada = await updateEmpresa(empresa.id, { activo: false });
    expect(desactivada.activo).toBe(false);

    const sigueExistiendo = await prisma.empresa.findUnique({
      where: { id: empresa.id },
    });
    expect(sigueExistiendo).not.toBeNull();
  });

  it("lista con búsqueda, filtro de estado y paginación", async () => {
    for (const [i, cod] of ["A1", "A2", "A3"].entries()) {
      await createEmpresa({
        codigo: cod,
        nombre: `Empresa ${i}`,
        clasificacion: null,
        ubicacion: null,
      });
    }
    const lista = await listEmpresas({
      q: "empresa",
      activo: "all",
      page: 1,
      pageSize: 2,
    });
    expect(lista.total).toBe(3);
    expect(lista.data).toHaveLength(2);

    const soloActivas = await listEmpresas({
      activo: "true",
      page: 1,
      pageSize: 20,
    });
    expect(soloActivas.total).toBe(3);

    const sinResultados = await listEmpresas({
      q: "zzz",
      activo: "all",
      page: 1,
      pageSize: 20,
    });
    expect(sinResultados.total).toBe(0);
  });
});
