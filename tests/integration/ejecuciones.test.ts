import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createEmpresa } from "@/modules/empresas/services/empresa.service";
import { createEmpleado } from "@/modules/empleados/services/empleado.service";
import {
  addEmpresaToEvento,
  createEvento,
} from "@/modules/eventos/services/evento.service";
import { checkIn } from "@/modules/participantes/services/participante.service";
import {
  ejecutarSorteo,
  listEjecuciones,
} from "@/modules/sorteos/services/ejecucion.service";
import {
  addRegla,
  createSorteo,
  updateSorteo,
} from "@/modules/sorteos/services/sorteo.service";
import { cleanDatabase } from "./helpers";

const EMPRESA = {
  codigo: "ACME",
  nombre: "Acme",
  clasificacion: null,
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

const empleadoInput = (empresaId: string, n: number) => ({
  empresaId,
  codigo: `E-${n}`,
  identificacion: null,
  nombres: `Empleado${n}`,
  apellidos: "Test",
  correo: `e${n}@example.com`,
  departamento: null,
  puesto: null,
  zona: null,
  clasificacion: null,
  fechaIngreso: new Date("2020-01-15"),
});

const SORTEO = {
  nombre: "Sorteo",
  descripcion: null,
  cantidadGanadores: 2,
  orden: 0,
  asistenciaObligatoria: true,
};

async function setup(conEmpleados = 0) {
  const empresa = await createEmpresa(EMPRESA);
  const evento = await createEvento(EVENTO);
  await addEmpresaToEvento(evento.id, { empresaId: empresa.id });
  const empleados = [];
  for (let i = 1; i <= conEmpleados; i++) {
    const e = await createEmpleado(empleadoInput(empresa.id, i));
    await checkIn(evento.id, { empleadoId: e.id });
    empleados.push(e);
  }
  return { empresa, evento, empleados };
}

async function sorteoActivo(eventoId: string, over: object = {}) {
  const s = await createSorteo(eventoId, { ...SORTEO, ...over });
  await updateSorteo(s.id, { estado: "ACTIVO" });
  return s;
}

describe("ejecución de sorteos", () => {
  beforeEach(cleanDatabase);

  it("selecciona N ganadores, guarda snapshots y finaliza el sorteo", async () => {
    const { evento } = await setup(5);
    const sorteo = await sorteoActivo(evento.id);

    const res = await ejecutarSorteo(sorteo.id);

    expect(res.estado).toBe("COMPLETADA");
    expect(res.ganadores).toHaveLength(2);
    expect(new Set(res.ganadores).size).toBe(2);

    const [ejecucion] = await listEjecuciones(sorteo.id);
    expect(ejecucion.totalCandidatos).toBe(5);
    expect(ejecucion.ganadores).toHaveLength(2);
    expect(ejecucion.reglasSnapshot).toEqual([]);

    const actualizado = await prisma.sorteo.findUniqueOrThrow({
      where: { id: sorteo.id },
    });
    expect(actualizado.estado).toBe("FINALIZADO");
  });

  it("rechaza ejecutar un sorteo que no está ACTIVO", async () => {
    const { evento } = await setup(3);
    const borrador = await createSorteo(evento.id, SORTEO);
    await expect(ejecutarSorteo(borrador.id)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("registra FALLIDA sin ganadores cuando hay candidatos insuficientes", async () => {
    const { evento } = await setup(1); // 1 candidato, se piden 2
    const sorteo = await sorteoActivo(evento.id);

    await expect(ejecutarSorteo(sorteo.id)).rejects.toBeInstanceOf(
      ConflictError,
    );

    const [ejecucion] = await listEjecuciones(sorteo.id);
    expect(ejecucion.estado).toBe("FALLIDA");
    expect(ejecucion.error).toContain("insuficientes");
    expect(ejecucion.ganadores).toHaveLength(0);
    expect(
      await prisma.sorteoGanador.count({ where: { eventoId: evento.id } }),
    ).toBe(0);
  });

  it("una FALLIDA no bloquea reintentos; una COMPLETADA sí", async () => {
    const { empresa, evento } = await setup(1);
    const sorteo = await sorteoActivo(evento.id);
    await expect(ejecutarSorteo(sorteo.id)).rejects.toBeInstanceOf(
      ConflictError,
    );

    // añadir otro empleado elegible y reintentar → ahora completa
    const e2 = await createEmpleado(empleadoInput(empresa.id, 2));
    await checkIn(evento.id, { empleadoId: e2.id });
    const res = await ejecutarSorteo(sorteo.id);
    expect(res.estado).toBe("COMPLETADA");

    // el sorteo quedó FINALIZADO → no re-ejecutable ni reactivable para otra ejecución
    await expect(ejecutarSorteo(sorteo.id)).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      updateSorteo(sorteo.id, { estado: "ACTIVO" }),
    ).rejects.toBeInstanceOf(ConflictError); // edición bloqueada post-completada
  });

  it("impide editar sorteo y reglas tras una ejecución completada", async () => {
    const { evento } = await setup(3);
    const sorteo = await sorteoActivo(evento.id);
    await ejecutarSorteo(sorteo.id);

    await expect(
      updateSorteo(sorteo.id, { nombre: "otro" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      addRegla(sorteo.id, {
        entidad: "EMPLEADO",
        campo: "departamento",
        operador: "IGUAL",
        valor: "X",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("un ganador no es elegible en otros sorteos del mismo evento", async () => {
    const { evento, empleados } = await setup(3);
    const s1 = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    const r1 = await ejecutarSorteo(s1.id);
    const ganador1 = r1.ganadores[0];

    const s2 = await sorteoActivo(evento.id, {
      nombre: "Segundo",
      cantidadGanadores: 3,
    });
    // solo quedan 2 candidatos (3 - 1 ganador) → insuficiente para 3
    await expect(ejecutarSorteo(s2.id)).rejects.toBeInstanceOf(ConflictError);

    const s3 = await sorteoActivo(evento.id, {
      nombre: "Tercero",
      cantidadGanadores: 2,
    });
    const r3 = await ejecutarSorteo(s3.id);
    expect(r3.ganadores).not.toContain(ganador1);
    expect(r3.ganadores).toHaveLength(2);

    // los 3 empleados quedaron como ganadores del evento
    const total = await prisma.sorteoGanador.count({
      where: { eventoId: evento.id },
    });
    expect(total).toBe(3);
    expect(empleados).toHaveLength(3);
  });

  it("la unicidad (eventoId, empleadoId) está protegida en PostgreSQL", async () => {
    const { evento } = await setup(3);
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    const res = await ejecutarSorteo(sorteo.id);

    await expect(
      prisma.sorteoGanador.create({
        data: {
          ejecucionId: res.ejecucionId,
          eventoId: evento.id,
          empleadoId: res.ganadores[0],
        },
      }),
    ).rejects.toThrow(); // P2002
  });

  it("ejecuciones concurrentes del mismo evento se serializan: solo una completa", async () => {
    const { evento } = await setup(4);
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });

    const resultados = await Promise.allSettled([
      ejecutarSorteo(sorteo.id),
      ejecutarSorteo(sorteo.id),
    ]);

    const ok = resultados.filter(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<{ estado: string }>[];
    expect(ok).toHaveLength(1);
    expect(
      await prisma.sorteoGanador.count({ where: { eventoId: evento.id } }),
    ).toBe(1);
    expect(
      await prisma.sorteoEjecucion.count({
        where: { sorteoId: sorteo.id, estado: "COMPLETADA" },
      }),
    ).toBe(1);
  });

  it("aplica las reglas activas al seleccionar candidatos", async () => {
    const { empresa, evento } = await setup(0);
    // 2 empleados VENTAS con check-in + 2 IT con check-in
    for (const [i, dept] of [
      [1, "VENTAS"],
      [2, "VENTAS"],
      [3, "IT"],
      [4, "IT"],
    ] as const) {
      const e = await createEmpleado({
        ...empleadoInput(empresa.id, i),
        departamento: dept,
      });
      await checkIn(evento.id, { empleadoId: e.id });
    }

    const sorteo = await sorteoActivo(evento.id);
    await addRegla(sorteo.id, {
      entidad: "EMPLEADO",
      campo: "departamento",
      operador: "IGUAL",
      valor: "VENTAS",
    });
    await updateSorteo(sorteo.id, { estado: "ACTIVO" });

    const res = await ejecutarSorteo(sorteo.id);
    expect(res.totalCandidatos).toBe(2); // solo VENTAS

    const [eje] = await listEjecuciones(sorteo.id);
    expect(eje.reglasSnapshot).toHaveLength(1);
    expect(eje.candidatosSnapshot).toHaveLength(2);
  });
});
