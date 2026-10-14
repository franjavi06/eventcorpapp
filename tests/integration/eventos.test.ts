import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { createEmpresa, updateEmpresa } from "@/modules/empresas/services/empresa.service";
import {
  addEmpresaToEvento,
  createEvento,
  getEvento,
  listEventos,
  removeEmpresaFromEvento,
  updateEvento,
} from "@/modules/eventos/services/evento.service";
import { cleanDatabase } from "./helpers";

const EVENTO = {
  codigo: "EVT-1",
  nombre: "Fiesta de fin de año",
  descripcion: null,
  ubicacion: "Salón principal",
  fechaInicio: new Date("2026-12-18T18:00:00Z"),
  fechaFin: new Date("2026-12-18T23:00:00Z"),
};

const EMPRESA = {
  codigo: "ACME",
  nombre: "Acme",
  clasificacion: null,
  ubicacion: null,
};

describe("eventos service", () => {
  beforeEach(cleanDatabase);

  it("crea un evento en estado BORRADOR por defecto", async () => {
    const evento = await createEvento(EVENTO);
    expect(evento.estado).toBe("BORRADOR");
    expect(evento.codigo).toBe("EVT-1");
  });

  it("rechaza fechaInicio posterior a fechaFin", async () => {
    await expect(
      createEvento({ ...EVENTO, fechaFin: new Date("2026-12-01T00:00:00Z") }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("en update valida la coherencia contra los valores actuales", async () => {
    const evento = await createEvento(EVENTO);
    // Solo mueve fechaFin antes del inicio existente → inválido
    await expect(
      updateEvento(evento.id, { fechaFin: new Date("2026-12-01T00:00:00Z") }),
    ).rejects.toBeInstanceOf(ValidationError);
    // Actualización coherente sí pasa
    const ok = await updateEvento(evento.id, {
      fechaFin: new Date("2026-12-19T02:00:00Z"),
    });
    expect(ok.fechaFin.getTime()).toBe(Date.parse("2026-12-19T02:00:00Z"));
  });

  it("rechaza código duplicado", async () => {
    await createEvento(EVENTO);
    await expect(
      createEvento({ ...EVENTO, nombre: "Otro" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("lista con filtro de estado y búsqueda", async () => {
    await createEvento(EVENTO);
    await createEvento({ ...EVENTO, codigo: "EVT-2", nombre: "Kickoff", estado: "ACTIVO" });

    const activos = await listEventos({
      estado: "ACTIVO",
      page: 1,
      pageSize: 20,
    });
    expect(activos.total).toBe(1);
    expect(activos.data[0].codigo).toBe("EVT-2");

    const busqueda = await listEventos({
      q: "fiesta",
      estado: "all",
      page: 1,
      pageSize: 20,
    });
    expect(busqueda.total).toBe(1);
  });

  describe("empresas del evento", () => {
    it("asocia una empresa activa", async () => {
      const evento = await createEvento(EVENTO);
      const empresa = await createEmpresa(EMPRESA);

      await addEmpresaToEvento(evento.id, { empresaId: empresa.id });

      const detalle = await getEvento(evento.id);
      expect(detalle.empresas).toHaveLength(1);
      expect(detalle.empresas[0].empresa.codigo).toBe("ACME");
    });

    it("rechaza empresa inactiva", async () => {
      const evento = await createEvento(EVENTO);
      const empresa = await createEmpresa(EMPRESA);
      await updateEmpresa(empresa.id, { activo: false });

      await expect(
        addEmpresaToEvento(evento.id, { empresaId: empresa.id }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rechaza asociación duplicada", async () => {
      const evento = await createEvento(EVENTO);
      const empresa = await createEmpresa(EMPRESA);
      await addEmpresaToEvento(evento.id, { empresaId: empresa.id });

      await expect(
        addEmpresaToEvento(evento.id, { empresaId: empresa.id }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rechaza empresa inexistente", async () => {
      const evento = await createEvento(EVENTO);
      await expect(
        addEmpresaToEvento(evento.id, {
          empresaId: "3f8a2c1e-7b4d-4e2f-9a1b-0c3d5e6f7a8b",
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("desasocia una empresa y reporta cuando no estaba asociada", async () => {
      const evento = await createEvento(EVENTO);
      const empresa = await createEmpresa(EMPRESA);
      await addEmpresaToEvento(evento.id, { empresaId: empresa.id });

      await removeEmpresaFromEvento(evento.id, empresa.id);
      const detalle = await getEvento(evento.id);
      expect(detalle.empresas).toHaveLength(0);

      await expect(
        removeEmpresaFromEvento(evento.id, empresa.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
