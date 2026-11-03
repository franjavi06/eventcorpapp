import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { NotFoundError } from "@/lib/errors";
import { createEmpresa } from "@/modules/empresas/services/empresa.service";
import { createEmpleado } from "@/modules/empleados/services/empleado.service";
import {
  addEmpresaToEvento,
  createEvento,
} from "@/modules/eventos/services/evento.service";
import {
  addParticipante,
  checkIn,
  excluirDeSorteos,
} from "@/modules/participantes/services/participante.service";
import {
  addRegla,
  createSorteo,
  createSorteosBulk,
  deleteSorteo,
  getSorteo,
  listarElegibles,
  removeRegla,
  updateRegla,
  updateSorteo,
} from "@/modules/sorteos/services/sorteo.service";
import { cleanDatabase } from "./helpers";

const EMPRESA = {
  codigo: "ACME",
  nombre: "Acme",
  clasificacion: "GRUPO",
  ubicacion: null,
};

const EVENTO = {
  codigo: "EVT-1",
  nombre: "Evento",
  descripcion: null,
  ubicacion: null,
  fechaInicio: new Date("2026-12-18T18:00:00Z"),
  fechaFin: new Date("2026-12-18T23:00:00Z"),
};

const SORTEO = {
  nombre: "Sorteo principal",
  descripcion: null,
  cantidadGanadores: 2,
  orden: 1,
  asistenciaObligatoria: true,
};

const empleadoInput = (empresaId: string, over: object = {}) => ({
  empresaId,
  codigo: "E-1",
  identificacion: null,
  nombres: "Ana",
  apellidos: "Lopez",
  correo: "ana@example.com",
  departamento: "VENTAS",
  puesto: null,
  zona: null,
  clasificacion: null,
  fechaIngreso: new Date("2020-01-15"),
  ...over,
});

async function setup() {
  const empresa = await createEmpresa(EMPRESA);
  const evento = await createEvento(EVENTO);
  await addEmpresaToEvento(evento.id, { empresaId: empresa.id });
  return { empresa, evento };
}

describe("sorteos service", () => {
  beforeEach(cleanDatabase);

  it("crea un sorteo con asistencia obligatoria por defecto", async () => {
    const { evento } = await setup();
    const s = await createSorteo(evento.id, SORTEO);
    expect(s.estado).toBe("BORRADOR");
    expect(s.asistenciaObligatoria).toBe(true);
    expect(s.modoRevelacion).toBe("AUTOMATICO");
    expect(s.duracionAnimacionSegundos).toBe(3);
  });

  it("permite configurar modoRevelacion y duracionAnimacionSegundos", async () => {
    const { evento } = await setup();
    const s = await createSorteo(evento.id, {
      ...SORTEO,
      modoRevelacion: "MANUAL",
      duracionAnimacionSegundos: 5,
    });
    expect(s.modoRevelacion).toBe("MANUAL");
    expect(s.duracionAnimacionSegundos).toBe(5);

    const actualizado = await updateSorteo(s.id, {
      modoRevelacion: "AUTOMATICO",
      duracionAnimacionSegundos: 2,
    });
    expect(actualizado.modoRevelacion).toBe("AUTOMATICO");
    expect(actualizado.duracionAnimacionSegundos).toBe(2);
  });

  it("rechaza cantidadGanadores <= 0", async () => {
    const { evento } = await setup();
    await expect(
      createSorteo(evento.id, { ...SORTEO, cantidadGanadores: 0 }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rechaza sorteo en evento inexistente", async () => {
    await expect(
      createSorteo("3f8a2c1e-7b4d-4e2f-9a1b-0c3d5e6f7a8b", SORTEO),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("elimina un sorteo con sus reglas (cascade)", async () => {
    const { evento } = await setup();
    const s = await createSorteo(evento.id, SORTEO);
    await addRegla(s.id, {
      entidad: "EMPLEADO",
      campo: "departamento",
      operador: "IGUAL",
      valor: "VENTAS",
    });
    await deleteSorteo(s.id);
    await expect(
      updateSorteo(s.id, { nombre: "x" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("reglas", () => {
    it("rechaza regla con campo fuera del catálogo", async () => {
      const { evento } = await setup();
      const s = await createSorteo(evento.id, SORTEO);
      await expect(
        addRegla(s.id, {
          entidad: "EMPLEADO",
          campo: "password",
          operador: "IGUAL",
          valor: "x",
        }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rechaza operador incompatible con el tipo del campo", async () => {
      const { evento } = await setup();
      const s = await createSorteo(evento.id, SORTEO);
      await expect(
        addRegla(s.id, {
          entidad: "EMPLEADO",
          campo: "activo",
          operador: "CONTIENE",
          valor: "true",
        }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("updateRegla valida la regla resultante completa", async () => {
      const { evento } = await setup();
      const s = await createSorteo(evento.id, SORTEO);
      const r = await addRegla(s.id, {
        entidad: "EMPLEADO",
        campo: "departamento",
        operador: "IGUAL",
        valor: "VENTAS",
      });
      // cambiar a un operador inválido para texto→fecha sigue siendo válido;
      // pero un campo inexistente debe rechazarse
      await expect(
        updateRegla(r.id, { campo: "inexistente" }),
      ).rejects.toBeInstanceOf(ZodError);
      const ok = await updateRegla(r.id, { activo: false });
      expect(ok.activo).toBe(false);
      await removeRegla(r.id);
      await expect(removeRegla(r.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("elegibilidad efectiva", () => {
    it("combina reglas AND: ambas deben cumplirse", async () => {
      const { empresa, evento } = await setup();
      const ventas = await createEmpleado(empleadoInput(empresa.id));
      await createEmpleado(
        empleadoInput(empresa.id, {
          codigo: "E-2",
          correo: "b@example.com",
          departamento: "IT",
        }),
      );
      await checkIn(evento.id, { empleadoId: ventas.id });
      // E-3 hace check-in pero es de IT → la regla de departamento lo excluye
      const otros = await createEmpleado(
        empleadoInput(empresa.id, {
          codigo: "E-3",
          correo: "c@example.com",
          departamento: "IT",
        }),
      );
      await checkIn(evento.id, { empleadoId: otros.id });
      // E-2 no hizo check-in (queda fuera por asistencia obligatoria)

      const s = await createSorteo(evento.id, SORTEO);
      await addRegla(s.id, {
        entidad: "EMPLEADO",
        campo: "departamento",
        operador: "IGUAL",
        valor: "VENTAS",
      });
      await addRegla(s.id, {
        entidad: "EMPRESA",
        campo: "clasificacion",
        operador: "IGUAL",
        valor: "GRUPO",
      });

      const { total, data } = await listarElegibles(s.id);
      expect(total).toBe(1);
      expect(data[0].empleado.codigo).toBe("E-1");
    });

    it("sin asistencia obligatoria incluye participantes sin check-in", async () => {
      const { empresa, evento } = await setup();
      const e = await createEmpleado(empleadoInput(empresa.id));
      // participante sin check-in: lo añade addParticipante
      await addParticipante(evento.id, { empleadoId: e.id });

      const s = await createSorteo(evento.id, {
        ...SORTEO,
        asistenciaObligatoria: false,
      });
      const { total } = await listarElegibles(s.id);
      expect(total).toBe(1);
    });

    it("excluye participantes con participaSorteos=false", async () => {
      const { empresa, evento } = await setup();
      const e = await createEmpleado(empleadoInput(empresa.id));
      await checkIn(evento.id, { empleadoId: e.id });
      await excluirDeSorteos(evento.id, e.id, { motivo: "x" });

      const s = await createSorteo(evento.id, SORTEO);
      const { total } = await listarElegibles(s.id);
      expect(total).toBe(0);
    });

    it("las reglas inactivas no se aplican", async () => {
      const { empresa, evento } = await setup();
      const e = await createEmpleado(
        empleadoInput(empresa.id, { departamento: "IT" }),
      );
      await checkIn(evento.id, { empleadoId: e.id });

      const s = await createSorteo(evento.id, SORTEO);
      const r = await addRegla(s.id, {
        entidad: "EMPLEADO",
        campo: "departamento",
        operador: "IGUAL",
        valor: "VENTAS",
      });
      expect((await listarElegibles(s.id)).total).toBe(0);

      await updateRegla(r.id, { activo: false });
      expect((await listarElegibles(s.id)).total).toBe(1);
    });

    it("DISTINTO y CONTIENE funcionan sobre texto", async () => {
      const { empresa, evento } = await setup();
      const e = await createEmpleado(empleadoInput(empresa.id));
      await checkIn(evento.id, { empleadoId: e.id });

      const s = await createSorteo(evento.id, SORTEO);
      await addRegla(s.id, {
        entidad: "EMPLEADO",
        campo: "departamento",
        operador: "DISTINTO",
        valor: "IT",
      });
      await addRegla(s.id, {
        entidad: "EMPLEADO",
        campo: "departamento",
        operador: "CONTIENE",
        valor: "vent",
      });
      expect((await listarElegibles(s.id)).total).toBe(1);
    });

    it("regla de fecha ANTES_DE filtra por fechaIngreso", async () => {
      const { empresa, evento } = await setup();
      const e = await createEmpleado(empleadoInput(empresa.id));
      await checkIn(evento.id, { empleadoId: e.id });

      const s = await createSorteo(evento.id, SORTEO);
      await addRegla(s.id, {
        entidad: "EMPLEADO",
        campo: "fechaIngreso",
        operador: "ANTES_DE",
        valor: "2021-01-01",
      });
      expect((await listarElegibles(s.id)).total).toBe(1);

      await addRegla(s.id, {
        entidad: "EMPLEADO",
        campo: "fechaIngreso",
        operador: "DESPUES_DE",
        valor: "2025-01-01",
      });
      const { total } = await listarElegibles(s.id);
      expect(total).toBe(0);
    });

    it("createSorteosBulk crea múltiples sorteos con orden correlativo", async () => {
      const { evento } = await setup();
      const res = await createSorteosBulk(evento.id, {
        items: [
          { nombre: "Premio $2,500", cantidadGanadores: 20 },
          { nombre: "Premio $3,000", cantidadGanadores: 16 },
          { nombre: "Gran Premio $20,000", cantidadGanadores: 3 },
        ],
        estado: "ACTIVO",
        asistenciaObligatoria: true,
      });

      expect(res.creados).toBe(3);
      expect(res.data.map((s) => s.orden)).toEqual([1, 2, 3]);

      const primero = await getSorteo(res.data[0].id);
      expect(primero.cantidadGanadores).toBe(20);
      expect(primero.estado).toBe("ACTIVO");
    });
  });
});
