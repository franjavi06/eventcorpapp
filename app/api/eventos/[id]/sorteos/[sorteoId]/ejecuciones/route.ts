import { z } from "zod";

import { handleApiError, ok } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  sorteoIdParamsSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import {
  ejecutarSorteo,
  listEjecuciones,
} from "@/modules/sorteos/services/ejecucion.service";

const ejecutarSchema = z.object({
  ejecutadoPor: z
    .string()
    .trim()
    .max(150)
    .nullish()
    .transform((v) => v || null),
});

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/ejecuciones">,
) {
  try {
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    return ok(await listEjecuciones(sorteoId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/ejecuciones">,
) {
  try {
    const actor = await requirePermission("SORTEOS_EJECUTAR");
    const { sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    const raw = await request.text();
    const { ejecutadoPor } = ejecutarSchema.parse(raw ? JSON.parse(raw) : {});
    return ok(
      await ejecutarSorteo(sorteoId, ejecutadoPor ?? actor?.username),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
