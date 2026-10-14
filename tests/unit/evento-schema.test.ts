import { describe, expect, it } from "vitest";

import { eventoCreateSchema } from "@/modules/eventos/schemas/evento.schema";

const BASE = {
  codigo: "evt-1",
  nombre: "Evento",
  fechaInicio: "2026-12-18T18:00",
  fechaFin: "2026-12-18T23:00",
};

describe("eventoCreateSchema", () => {
  it("normaliza código a mayúsculas y aplica estado BORRADOR", () => {
    const out = eventoCreateSchema.parse(BASE);
    expect(out.codigo).toBe("EVT-1");
    expect(out.estado).toBe("BORRADOR");
  });

  it("rechaza fechaInicio > fechaFin", () => {
    const res = eventoCreateSchema.safeParse({
      ...BASE,
      fechaFin: "2026-12-01T00:00",
    });
    expect(res.success).toBe(false);
  });

  it("acepta mismo instante de inicio y fin", () => {
    const res = eventoCreateSchema.safeParse({
      ...BASE,
      fechaFin: BASE.fechaInicio,
    });
    expect(res.success).toBe(true);
  });
});
