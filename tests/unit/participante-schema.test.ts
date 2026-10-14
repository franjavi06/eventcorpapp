import { describe, expect, it } from "vitest";

import {
  exclusionSchema,
  participanteCreateSchema,
  participanteListQuerySchema,
} from "@/modules/participantes/schemas/participante.schema";

const UUID = "3f8a2c1e-7b4d-4e2f-9a1b-0c3d5e6f7a8b";

describe("participanteCreateSchema", () => {
  it("acepta un empleadoId uuid", () => {
    expect(participanteCreateSchema.parse({ empleadoId: UUID })).toEqual({
      empleadoId: UUID,
    });
  });

  it("rechaza ids no uuid", () => {
    expect(
      participanteCreateSchema.safeParse({ empleadoId: "abc" }).success,
    ).toBe(false);
  });
});

describe("exclusionSchema", () => {
  it("exige motivo no vacío", () => {
    expect(exclusionSchema.safeParse({ motivo: "" }).success).toBe(false);
    expect(exclusionSchema.safeParse({ motivo: "  " }).success).toBe(false);
    expect(exclusionSchema.safeParse({}).success).toBe(false);
  });

  it("normaliza responsable vacío a null", () => {
    const out = exclusionSchema.parse({ motivo: "x", responsable: " " });
    expect(out.responsable).toBeNull();
  });
});

describe("participanteListQuerySchema", () => {
  it("aplica valores por defecto", () => {
    const out = participanteListQuerySchema.parse({});
    expect(out.asistencia).toBe("all");
    expect(out.sorteos).toBe("all");
    expect(out.page).toBe(1);
  });
});
