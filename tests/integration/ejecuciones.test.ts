import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createEmpresa } from "@/modules/empresas/services/empresa.service";
import { createEmpleado } from "@/modules/empleados/services/empleado.service";
import {
  addEmpresaToEvento,
  createEvento,
} from "@/modules/eventos/services/evento.service";
import { checkIn } from "@/modules/participantes/services/participante.service";
import {
  agregarGanadoresAdicionales,
  ejecutarSorteo,
  listEjecuciones,
  reemplazarGanadorAusente,
} from "@/modules/sorteos/services/ejecucion.service";
import {
  addCuota,
  addRegla,
  createSorteo,
  getSorteo,
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

  it("reparte exactamente los cupos por departamento usando SorteoCuota y falla si falta cupo en un área", async () => {
    const { empresa, evento } = await setup(0);
    // 2 ADMINISTRACION, 3 OPERACIONES, 1 COMERCIAL
    const creados: { id: string; dept: string }[] = [];
    for (const [i, dept] of [
      [1, "ADMINISTRACION"],
      [2, "ADMINISTRACION"],
      [3, "OPERACIONES"],
      [4, "OPERACIONES"],
      [5, "OPERACIONES"],
      [6, "COMERCIAL"],
    ] as const) {
      const e = await createEmpleado({
        ...empleadoInput(empresa.id, i),
        departamento: dept,
      });
      await checkIn(evento.id, { empleadoId: e.id });
      creados.push({ id: e.id, dept });
    }

    const sorteo = await createSorteo(evento.id, {
      ...SORTEO,
      cantidadGanadores: 1,
      estado: "ACTIVO",
    });

    await addCuota(sorteo.id, {
      entidad: "EMPLEADO",
      campo: "departamento",
      valor: "ADMINISTRACION",
      cantidad: 1,
    });
    await addCuota(sorteo.id, {
      entidad: "EMPLEADO",
      campo: "departamento",
      valor: "OPERACIONES",
      cantidad: 2,
    });

    const actualizado = await getSorteo(sorteo.id);
    expect(actualizado.cantidadGanadores).toBe(3);

    const res = await ejecutarSorteo(sorteo.id);
    expect(res.ganadores).toHaveLength(3);

    const deptsGanadores = res.ganadores.map(
      (id) => creados.find((c) => c.id === id)?.dept,
    );
    expect(deptsGanadores.filter((d) => d === "ADMINISTRACION")).toHaveLength(1);
    expect(deptsGanadores.filter((d) => d === "OPERACIONES")).toHaveLength(2);
  });
});

describe("reemplazo de ganador ausente", () => {
  beforeEach(cleanDatabase);

  async function ganadoresDe(sorteoId: string) {
    const [eje] = await listEjecuciones(sorteoId);
    return eje.ganadores;
  }

  it("marca AUSENTE al ganador, crea reemplazo VALIDO en su posición y audita", async () => {
    const { evento } = await setup(4);
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    const res = await ejecutarSorteo(sorteo.id);
    const [ganador] = await ganadoresDe(sorteo.id);
    expect(ganador.posicion).toBe(1);

    const out = await reemplazarGanadorAusente(
      evento.id,
      sorteo.id,
      ganador.id,
      "Se retiró del evento",
      "admin",
    );

    expect(out.ganadorAusenteId).toBe(ganador.id);
    expect(out.posicion).toBe(1);
    expect(out.reemplazo.empleadoId).not.toBe(res.ganadores[0]);
    const ausenteEmpId = res.ganadores[0];
    expect(out.reemplazo.nombre).toBeTruthy();

    const original = await prisma.sorteoGanador.findUniqueOrThrow({
      where: { id: ganador.id },
    });
    expect(original.estado).toBe("AUSENTE");
    expect(original.motivoAusencia).toBe("Se retiró del evento");
    expect(original.reemplazadoPor).toBe("admin");
    expect(original.reemplazadoAt).not.toBeNull();
    expect(ausenteEmpId).toBe(res.ganadores[0]);

    const nuevo = await prisma.sorteoGanador.findUniqueOrThrow({
      where: { id: out.ganadorReemplazoId },
    });
    expect(nuevo.estado).toBe("VALIDO");
    expect(nuevo.posicion).toBe(1);
    expect(nuevo.reemplazaAGanadorId).toBe(ganador.id);
    expect(nuevo.ejecucionId).toBe(ganador.ejecucionId);

    const audit = await prisma.auditoria.findFirstOrThrow({
      where: { accion: "REEMPLAZAR_GANADOR", entidadId: ganador.id },
    });
    expect(audit.actor).toBe("admin");
    expect((audit.despues as { reemplazoGanadorId: string }).reemplazoGanadorId).toBe(
      nuevo.id,
    );
  });

  it("usa 'No presente' como motivo por defecto", async () => {
    const { evento } = await setup(3);
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    await ejecutarSorteo(sorteo.id);
    const [ganador] = await ganadoresDe(sorteo.id);

    await reemplazarGanadorAusente(evento.id, sorteo.id, ganador.id);

    const original = await prisma.sorteoGanador.findUniqueOrThrow({
      where: { id: ganador.id },
    });
    expect(original.motivoAusencia).toBe("No presente");
  });

  it("rechaza reemplazar un ganador ya ausente", async () => {
    const { evento } = await setup(4);
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    await ejecutarSorteo(sorteo.id);
    const [ganador] = await ganadoresDe(sorteo.id);
    await reemplazarGanadorAusente(evento.id, sorteo.id, ganador.id);

    await expect(
      reemplazarGanadorAusente(evento.id, sorteo.id, ganador.id),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("falla sin modificar nada cuando no hay candidatos de reemplazo", async () => {
    const { evento } = await setup(2);
    const sorteo = await sorteoActivo(evento.id);
    await ejecutarSorteo(sorteo.id); // ganan los 2 → pool vacío
    const [ganador] = await ganadoresDe(sorteo.id);

    await expect(
      reemplazarGanadorAusente(evento.id, sorteo.id, ganador.id),
    ).rejects.toBeInstanceOf(ConflictError);

    const original = await prisma.sorteoGanador.findUniqueOrThrow({
      where: { id: ganador.id },
    });
    expect(original.estado).toBe("VALIDO"); // sin cambios
    expect(
      await prisma.sorteoGanador.count({ where: { eventoId: evento.id } }),
    ).toBe(2);
  });

  it("respeta la cuota del puesto al elegir el reemplazo", async () => {
    const { empresa, evento } = await setup(0);
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

    const sorteo = await createSorteo(evento.id, {
      ...SORTEO,
      cantidadGanadores: 1,
      estado: "ACTIVO",
    });
    await addCuota(sorteo.id, {
      entidad: "EMPLEADO",
      campo: "departamento",
      valor: "VENTAS",
      cantidad: 1,
    });

    await ejecutarSorteo(sorteo.id);
    const [ganador] = await ganadoresDe(sorteo.id);
    expect(ganador.cuotaSnapshot).not.toBeNull();

    const out = await reemplazarGanadorAusente(
      evento.id,
      sorteo.id,
      ganador.id,
    );

    const reemplazoEmpleado = await prisma.empleado.findUniqueOrThrow({
      where: { id: out.reemplazo.empleadoId },
    });
    expect(reemplazoEmpleado.departamento).toBe("VENTAS");

    // si el único VENTAS restante también sale, ya no hay quién cumpla la cuota
    const [eje] = await listEjecuciones(sorteo.id);
    const nuevo = eje.ganadores.find((g) => g.id === out.ganadorReemplazoId)!;
    await expect(
      reemplazarGanadorAusente(evento.id, sorteo.id, nuevo.id),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("el ausente sigue excluido de sorteos posteriores del evento", async () => {
    const { evento, empleados } = await setup(3);
    const s1 = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    const r1 = await ejecutarSorteo(s1.id);
    const [ganador] = await ganadoresDe(s1.id);
    await reemplazarGanadorAusente(evento.id, s1.id, ganador.id);

    // el evento tiene 3 ganadores registrados (1 ausente + 1 válido) pero solo
    // 2 empleados distintos ya premiados; queda 1 candidato para el sorteo 2
    const s2 = await sorteoActivo(evento.id, {
      nombre: "Segundo",
      cantidadGanadores: 2,
    });
    await expect(ejecutarSorteo(s2.id)).rejects.toBeInstanceOf(ConflictError);

    const s3 = await sorteoActivo(evento.id, {
      nombre: "Tercero",
      cantidadGanadores: 1,
    });
    const r3 = await ejecutarSorteo(s3.id);
    expect(r3.ganadores).toHaveLength(1);
    expect(r3.ganadores[0]).not.toBe(r1.ganadores[0]);

    const empleadosPremiados = await prisma.sorteoGanador.groupBy({
      by: ["empleadoId"],
      where: { eventoId: evento.id },
    });
    expect(empleadosPremiados).toHaveLength(3); // 3 empleados, 4 filas
    expect(empleados).toHaveLength(3);
  });

  it("rechaza IDs de otro evento o sorteo", async () => {
    const { evento } = await setup(3);
    const otroEvento = await createEvento({ ...EVENTO, codigo: "EVT-2" });
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    await ejecutarSorteo(sorteo.id);
    const [ganador] = await ganadoresDe(sorteo.id);

    await expect(
      reemplazarGanadorAusente(otroEvento.id, sorteo.id, ganador.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      reemplazarGanadorAusente(evento.id, crypto.randomUUID(), ganador.id),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ganadores adicionales", () => {
  beforeEach(cleanDatabase);

  const libre = (cantidad = 1, motivo: string | null = null) => ({
    cantidad,
    motivo,
    cuota: null,
  });

  it("agrega N ganadores con posiciones consecutivas sin tocar el sorteo", async () => {
    const { evento } = await setup(5);
    const sorteo = await sorteoActivo(evento.id);
    await ejecutarSorteo(sorteo.id); // 2 titulares (#1, #2)

    const res = await agregarGanadoresAdicionales(
      evento.id,
      sorteo.id,
      libre(2, "Premio extra de última hora"),
      "admin",
    );

    expect(res.posicionBase).toBe(2);
    expect(res.ganadores).toHaveLength(2);
    expect(res.ganadores.map((g) => g.posicion)).toEqual([3, 4]);
    expect(new Set(res.ganadores.map((g) => g.empleadoId)).size).toBe(2);

    const ejecucion = await prisma.sorteoEjecucion.findUniqueOrThrow({
      where: { id: res.ejecucionId },
    });
    expect(ejecucion.esAdicional).toBe(true);
    expect(ejecucion.motivo).toBe("Premio extra de última hora");
    expect(ejecucion.ejecutadoPor).toBe("admin");

    const sorteoDb = await prisma.sorteo.findUniqueOrThrow({
      where: { id: sorteo.id },
    });
    expect(sorteoDb.cantidadGanadores).toBe(2); // configuración intacta
    expect(sorteoDb.estado).toBe("FINALIZADO");

    const audit = await prisma.auditoria.findFirstOrThrow({
      where: { accion: "AGREGAR_GANADORES_ADICIONALES", entidadId: res.ejecucionId },
    });
    expect(audit.actor).toBe("admin");

    // los adicionales se ven en el historial como VALIDO
    const [eje] = await listEjecuciones(sorteo.id);
    const adicional = (await listEjecuciones(sorteo.id)).find(
      (e) => e.id === res.ejecucionId,
    )!;
    expect(adicional.esAdicional).toBe(true);
    expect(adicional.ganadores.map((g) => g.posicion)).toEqual([3, 4]);
    expect(eje.ganadores).toHaveLength(2);
  });

  it("rechaza sortear adicionales en un sorteo no finalizado o de otro evento", async () => {
    const { evento } = await setup(3);
    const borrador = await createSorteo(evento.id, SORTEO);
    await expect(
      agregarGanadoresAdicionales(evento.id, borrador.id, libre()),
    ).rejects.toBeInstanceOf(ValidationError);

    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    await ejecutarSorteo(sorteo.id);
    const otroEvento = await createEvento({ ...EVENTO, codigo: "EVT-2" });
    await expect(
      agregarGanadoresAdicionales(otroEvento.id, sorteo.id, libre()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("excluye a ganadores válidos y ausentes del evento", async () => {
    const { evento } = await setup(3);
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    await ejecutarSorteo(sorteo.id);
    const [ganador] = (await listEjecuciones(sorteo.id))[0].ganadores;
    // un titular pasa a AUSENTE → quedan 2 ganadores registrados (ambos excluidos)
    await reemplazarGanadorAusente(evento.id, sorteo.id, ganador.id);

    const res = await agregarGanadoresAdicionales(
      evento.id,
      sorteo.id,
      libre(1),
    );
    const empleadosUsados = await prisma.sorteoGanador.findMany({
      where: { eventoId: evento.id, NOT: { id: res.ganadores[0].id } },
      select: { empleadoId: true },
    });
    expect(
      empleadosUsados.map((e) => e.empleadoId),
    ).not.toContain(res.ganadores[0].empleadoId);

    // solo quedaba 1 candidato (3 empleados - 2 premiados); pedir otro falla
    await expect(
      agregarGanadoresAdicionales(evento.id, sorteo.id, libre(1)),
    ).rejects.toBeInstanceOf(ConflictError);
    const fallida = await prisma.sorteoEjecucion.findFirstOrThrow({
      where: { sorteoId: sorteo.id, estado: "FALLIDA", esAdicional: true },
    });
    expect(fallida.error).toContain("insuficientes");
  });

  it("aplica la cuota indicada en el diálogo y la guarda en cuotaSnapshot", async () => {
    const { empresa, evento } = await setup(0);
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
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    await ejecutarSorteo(sorteo.id);

    const res = await agregarGanadoresAdicionales(evento.id, sorteo.id, {
      cantidad: 1,
      motivo: null,
      cuota: { entidad: "EMPLEADO", campo: "departamento", valor: "VENTAS" },
    });

    const empleado = await prisma.empleado.findUniqueOrThrow({
      where: { id: res.ganadores[0].empleadoId },
    });
    expect(empleado.departamento).toBe("VENTAS");
    const ganadorDb = await prisma.sorteoGanador.findUniqueOrThrow({
      where: { id: res.ganadores[0].id },
    });
    expect(ganadorDb.cuotaSnapshot).toMatchObject({ valor: "VENTAS" });
  });

  it("un ganador adicional también puede marcarse ausente y reemplazarse", async () => {
    const { evento } = await setup(4);
    const sorteo = await sorteoActivo(evento.id, { cantidadGanadores: 1 });
    await ejecutarSorteo(sorteo.id);
    const res = await agregarGanadoresAdicionales(
      evento.id,
      sorteo.id,
      libre(1),
    );

    const out = await reemplazarGanadorAusente(
      evento.id,
      sorteo.id,
      res.ganadores[0].id,
      null,
      "admin",
    );

    expect(out.posicion).toBe(2); // conserva su posición adicional
    const nuevo = await prisma.sorteoGanador.findUniqueOrThrow({
      where: { id: out.ganadorReemplazoId },
    });
    // el adicional era libre: el reemplazo no hereda cuotas del sorteo
    expect(nuevo.cuotaSnapshot).toBeNull();
    expect(nuevo.ejecucionId).toBe(res.ejecucionId);
  });
});
