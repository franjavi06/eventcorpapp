import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  addEmpresaToEvento,
  createEvento,
  removeEmpresaFromEvento,
  updateEvento,
} from "@/modules/eventos/services/evento.service";
import {
  addParticipante,
  checkIn,
  excluirDeSorteos,
} from "@/modules/participantes/services/participante.service";
import {
  addRegla,
  createSorteo,
  updateSorteo,
} from "@/modules/sorteos/services/sorteo.service";
import { ejecutarSorteo } from "@/modules/sorteos/services/ejecucion.service";
import { cleanDatabase } from "./helpers";

const EMPRESA = {
  codigo: "EMP-AUD",
  nombre: "Empresa Audit",
};

const EVENTO = {
  codigo: "EVT-AUD",
  nombre: "Evento Auditoría",
  fechaInicio: new Date("2026-12-01T18:00:00Z"),
  fechaFin: new Date("2026-12-01T23:00:00Z"),
};

async function seedEmpresa() {
  return prisma.empresa.create({ data: EMPRESA });
}

async function seedEmpleado(empresaId: string, codigo = "E-1") {
  return prisma.empleado.create({
    data: {
      empresaId,
      codigo,
      nombres: "Ana",
      apellidos: "Test",
      correo: `${codigo.toLowerCase()}@test.dev`,
      departamento: "IT",
      fechaIngreso: new Date("2020-01-01"),
    },
  });
}

async function accionesDe(eventoId: string) {
  const rows = await prisma.auditoria.findMany({
    where: { eventoId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => `${r.entidad}:${r.accion}`);
}

describe("auditoría", () => {
  beforeEach(cleanDatabase);

  it("registra creación y actualización de eventos", async () => {
    const evento = await createEvento(EVENTO);
    await updateEvento(evento.id, { estado: "ACTIVO" });

    const acciones = await accionesDe(evento.id);
    expect(acciones).toContain("Evento:CREAR");
    expect(acciones).toContain("Evento:ACTUALIZAR");

    const update = await prisma.auditoria.findFirst({
      where: { eventoId: evento.id, accion: "ACTUALIZAR" },
    });
    expect(update?.antes).toMatchObject({ estado: "BORRADOR" });
    expect(update?.despues).toMatchObject({ estado: "ACTIVO" });
  });

  it("registra asociación y desasociación de empresas", async () => {
    const evento = await createEvento(EVENTO);
    const empresa = await seedEmpresa();
    await addEmpresaToEvento(evento.id, { empresaId: empresa.id });
    await removeEmpresaFromEvento(evento.id, empresa.id);

    const acciones = await accionesDe(evento.id);
    expect(acciones).toContain("EventoEmpresa:ASOCIAR_EMPRESA");
    expect(acciones).toContain("EventoEmpresa:DESASOCIAR_EMPRESA");
  });

  it("registra participantes, check-in y exclusiones", async () => {
    const evento = await createEvento(EVENTO);
    const empresa = await seedEmpresa();
    await addEmpresaToEvento(evento.id, { empresaId: empresa.id });
    const empleado = await seedEmpleado(empresa.id);

    await addParticipante(evento.id, { empleadoId: empleado.id });
    await checkIn(evento.id, { empleadoId: empleado.id });
    await excluirDeSorteos(evento.id, empleado.id, {
      motivo: "Directivo",
      responsable: "rrhh",
    });

    const acciones = await accionesDe(evento.id);
    expect(acciones).toContain("EventoParticipante:AGREGAR_PARTICIPANTE");
    expect(acciones).toContain("Asistencia:CHECK_IN");
    expect(acciones).toContain("EventoParticipante:EXCLUIR_SORTEOS");

    const exclusion = await prisma.auditoria.findFirst({
      where: { eventoId: evento.id, accion: "EXCLUIR_SORTEOS" },
    });
    expect(exclusion?.actor).toBe("rrhh");
  });

  it("registra sorteos, reglas y ejecución en la misma transacción", async () => {
    const evento = await createEvento(EVENTO);
    const empresa = await seedEmpresa();
    await addEmpresaToEvento(evento.id, { empresaId: empresa.id });
    const empleado = await seedEmpleado(empresa.id);
    await checkIn(evento.id, { empleadoId: empleado.id });

    const sorteo = await createSorteo(evento.id, {
      nombre: "Sorteo Audit",
      cantidadGanadores: 1,
    });
    await addRegla(sorteo.id, {
      entidad: "EMPLEADO",
      campo: "departamento",
      operador: "DISTINTO",
      valor: "Nada",
    });
    await updateSorteo(sorteo.id, { estado: "ACTIVO" });
    const ejecucion = await ejecutarSorteo(sorteo.id, "admin");

    const acciones = await accionesDe(evento.id);
    expect(acciones).toContain("Sorteo:CREAR");
    expect(acciones).toContain("SorteoRegla:AGREGAR_REGLA");
    expect(acciones).toContain("Sorteo:ACTUALIZAR");
    expect(acciones).toContain("SorteoEjecucion:EJECUTAR_SORTEO");

    const auditEjec = await prisma.auditoria.findFirst({
      where: { accion: "EJECUTAR_SORTEO", entidadId: ejecucion.ejecucionId },
    });
    expect(auditEjec).not.toBeNull();
    expect(auditEjec?.actor).toBe("admin");
    expect(auditEjec?.despues).toMatchObject({
      sorteoId: sorteo.id,
      ganadores: [empleado.id],
    });
  });

  it("registra ejecuciones fallidas", async () => {
    const evento = await createEvento(EVENTO);
    const empresa = await seedEmpresa();
    await addEmpresaToEvento(evento.id, { empresaId: empresa.id });

    const sorteo = await createSorteo(evento.id, {
      nombre: "Sorteo vacío",
      cantidadGanadores: 5,
    });
    await updateSorteo(sorteo.id, { estado: "ACTIVO" });
    await expect(ejecutarSorteo(sorteo.id)).rejects.toThrow(
      "Candidatos insuficientes",
    );

    const audit = await prisma.auditoria.findFirst({
      where: { eventoId: evento.id, accion: "EJECUCION_FALLIDA" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.despues).toMatchObject({ sorteoId: sorteo.id });
  });
});
