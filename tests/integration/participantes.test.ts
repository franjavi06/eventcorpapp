import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  createEmpresa,
  updateEmpresa,
} from "@/modules/empresas/services/empresa.service";
import {
  createEmpleado,
  updateEmpleado,
} from "@/modules/empleados/services/empleado.service";
import {
  addEmpresaToEvento,
  createEvento,
  removeEmpresaFromEvento,
} from "@/modules/eventos/services/evento.service";
import {
  addParticipante,
  checkIn,
  excluirDeSorteos,
  listCandidatos,
  removeParticipante,
  undoCheckIn,
} from "@/modules/participantes/services/participante.service";
import { cleanDatabase } from "./helpers";

const EMPRESA = {
  codigo: "ACME",
  nombre: "Acme",
  clasificacion: null,
  ubicacion: null,
};

const OTRA_EMPRESA = {
  codigo: "BETA",
  nombre: "Beta",
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

const empleadoInput = (empresaId: string, over: object = {}) => ({
  empresaId,
  codigo: "E-1",
  identificacion: null,
  nombres: "Ana",
  apellidos: "Lopez",
  correo: "ana@example.com",
  departamento: null,
  puesto: null,
  zona: null,
  clasificacion: null,
  fechaIngreso: new Date("2020-01-15"),
  ...over,
});

async function setup(habilitarOtra = false) {
  const empresa = await createEmpresa(EMPRESA);
  const otra = await createEmpresa(OTRA_EMPRESA);
  const evento = await createEvento(EVENTO);
  await addEmpresaToEvento(evento.id, { empresaId: empresa.id });
  if (habilitarOtra) {
    await addEmpresaToEvento(evento.id, { empresaId: otra.id });
  }
  return { empresa, otra, evento };
}

describe("participantes service", () => {
  beforeEach(cleanDatabase);

  it("incorpora un empleado de empresa habilitada", async () => {
    const { empresa, evento } = await setup();
    const empleado = await createEmpleado(empleadoInput(empresa.id));

    const p = await addParticipante(evento.id, { empleadoId: empleado.id });

    expect(p.participaSorteos).toBe(true);
    expect(p.empleado.codigo).toBe("E-1");
  });

  it("rechaza empleado de empresa no habilitada", async () => {
    const { otra, evento } = await setup();
    const empleado = await createEmpleado(
      empleadoInput(otra.id, { correo: "otro@example.com" }),
    );

    await expect(
      addParticipante(evento.id, { empleadoId: empleado.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rechaza empleado inactivo", async () => {
    const { empresa, evento } = await setup();
    const empleado = await createEmpleado(empleadoInput(empresa.id));
    await updateEmpleado(empleado.id, { activo: false });

    await expect(
      addParticipante(evento.id, { empleadoId: empleado.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rechaza empleado de empresa desactivada tras la asociación", async () => {
    const { empresa, evento } = await setup();
    const empleado = await createEmpleado(empleadoInput(empresa.id));
    await updateEmpresa(empresa.id, { activo: false });

    await expect(
      addParticipante(evento.id, { empleadoId: empleado.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rechaza participante duplicado", async () => {
    const { empresa, evento } = await setup();
    const empleado = await createEmpleado(empleadoInput(empresa.id));
    await addParticipante(evento.id, { empleadoId: empleado.id });

    await expect(
      addParticipante(evento.id, { empleadoId: empleado.id }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("no permite desasociar empresa con asistencia registrada", async () => {
    const { empresa, evento } = await setup();
    const empleado = await createEmpleado(empleadoInput(empresa.id));
    await checkIn(evento.id, { empleadoId: empleado.id });

    await expect(
      removeEmpresaFromEvento(evento.id, empresa.id),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  describe("check-in", () => {
    it("crea el participante automáticamente si no existe", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));

      const { asistencia } = await checkIn(evento.id, {
        empleadoId: empleado.id,
      });

      expect(asistencia.registradoAt).toBeInstanceOf(Date);
      const p = await prisma.eventoParticipante.findUnique({
        where: {
          eventoId_empleadoId: { eventoId: evento.id, empleadoId: empleado.id },
        },
        include: { asistencia: true },
      });
      expect(p).not.toBeNull();
      expect(p!.asistencia).not.toBeNull();
    });

    it("reutiliza el participante existente", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));
      const p = await addParticipante(evento.id, { empleadoId: empleado.id });

      const { participanteId } = await checkIn(evento.id, {
        empleadoId: empleado.id,
      });
      expect(participanteId).toBe(p.id);
    });

    it("rechaza check-in duplicado", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));
      await checkIn(evento.id, { empleadoId: empleado.id });

      await expect(
        checkIn(evento.id, { empleadoId: empleado.id }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rechaza check-in de empleado inactivo o de empresa no habilitada", async () => {
      const { empresa, otra, evento } = await setup();
      const inactivo = await createEmpleado(empleadoInput(empresa.id));
      await updateEmpleado(inactivo.id, { activo: false });
      const deOtra = await createEmpleado(
        empleadoInput(otra.id, { correo: "otro@example.com", codigo: "E-2" }),
      );

      await expect(
        checkIn(evento.id, { empleadoId: inactivo.id }),
      ).rejects.toBeInstanceOf(ValidationError);
      await expect(
        checkIn(evento.id, { empleadoId: deOtra.id }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("poncha por código de empleado", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));

      const res = await checkIn(evento.id, { codigo: "e-1" });

      expect(res.empleado.codigo).toBe("E-1");
      expect(res.empleado.empresa).toBe("Acme");
      expect(res.asistencia.registradoAt).toBeInstanceOf(Date);
      const p = await prisma.eventoParticipante.findUnique({
        where: {
          eventoId_empleadoId: { eventoId: evento.id, empleadoId: empleado.id },
        },
      });
      expect(p).not.toBeNull();
    });

    it("rechaza código inexistente o de empresa no habilitada", async () => {
      const { otra, evento } = await setup();
      await createEmpleado(
        empleadoInput(otra.id, { correo: "otro@example.com" }),
      );

      await expect(
        checkIn(evento.id, { codigo: "E-1" }),
      ).rejects.toBeInstanceOf(ValidationError);
      await expect(
        checkIn(evento.id, { codigo: "NOPE" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rechaza código ambiguo entre empresas habilitadas", async () => {
      const { empresa, otra, evento } = await setup(true);
      await createEmpleado(empleadoInput(empresa.id));
      await createEmpleado(
        empleadoInput(otra.id, { correo: "otro@example.com" }),
      );

      await expect(
        checkIn(evento.id, { codigo: "E-1" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("permite anular el check-in", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));
      await checkIn(evento.id, { empleadoId: empleado.id });

      await undoCheckIn(evento.id, empleado.id);

      await expect(
        undoCheckIn(evento.id, empleado.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("exclusión de sorteos", () => {
    it("registra motivo, fecha y responsable", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));
      await addParticipante(evento.id, { empleadoId: empleado.id });

      const p = await excluirDeSorteos(evento.id, empleado.id, {
        motivo: "Organizador del evento",
        responsable: "admin",
      });

      expect(p.participaSorteos).toBe(false);
      expect(p.exclusionMotivo).toBe("Organizador del evento");
      expect(p.exclusionAt).toBeInstanceOf(Date);
      expect(p.exclusionPor).toBe("admin");
    });

    it("exige motivo", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));
      await addParticipante(evento.id, { empleadoId: empleado.id });

      await expect(
        excluirDeSorteos(evento.id, empleado.id, { motivo: "  " }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rechaza exclusión repetida o de no participante", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));
      const input = { motivo: "x" };

      await expect(
        excluirDeSorteos(evento.id, empleado.id, input),
      ).rejects.toBeInstanceOf(NotFoundError);

      await addParticipante(evento.id, { empleadoId: empleado.id });
      await excluirDeSorteos(evento.id, empleado.id, input);
      await expect(
        excluirDeSorteos(evento.id, empleado.id, input),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("la exclusión no afecta la asistencia", async () => {
      const { empresa, evento } = await setup();
      const empleado = await createEmpleado(empleadoInput(empresa.id));
      await checkIn(evento.id, { empleadoId: empleado.id });
      await excluirDeSorteos(evento.id, empleado.id, { motivo: "x" });

      const p = await prisma.eventoParticipante.findUnique({
        where: {
          eventoId_empleadoId: { eventoId: evento.id, empleadoId: empleado.id },
        },
        include: { asistencia: true },
      });
      expect(p!.participaSorteos).toBe(false);
      expect(p!.asistencia).not.toBeNull();
    });
  });

  describe("quitar participante", () => {
    it("permite quitar sin asistencia y bloquea con asistencia", async () => {
      const { empresa, evento } = await setup();
      const e1 = await createEmpleado(empleadoInput(empresa.id));
      const e2 = await createEmpleado(
        empleadoInput(empresa.id, { codigo: "E-2", correo: "e2@example.com" }),
      );

      await addParticipante(evento.id, { empleadoId: e1.id });
      await removeParticipante(evento.id, e1.id);
      await expect(
        removeParticipante(evento.id, e1.id),
      ).rejects.toBeInstanceOf(NotFoundError);

      await checkIn(evento.id, { empleadoId: e2.id });
      await expect(
        removeParticipante(evento.id, e2.id),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("candidatos", () => {
    it("solo lista empleados activos de empresas habilitadas y activas", async () => {
      const { empresa, otra, evento } = await setup();
      await createEmpleado(empleadoInput(empresa.id));
      const inactivo = await createEmpleado(
        empleadoInput(empresa.id, {
          codigo: "E-2",
          correo: "inactivo@example.com",
        }),
      );
      await updateEmpleado(inactivo.id, { activo: false });
      await createEmpleado(
        empleadoInput(otra.id, { correo: "beta@example.com" }),
      );

      const candidatos = await listCandidatos(evento.id);
      expect(candidatos).toHaveLength(1);
      expect(candidatos[0].codigo).toBe("E-1");
    });
  });
});
