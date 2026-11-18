import { handleApiError, ok } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  ejecutarGanadoresAdicionalesSchema,
  sorteoIdParamsSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import { agregarGanadoresAdicionales } from "@/modules/sorteos/services/ejecucion.service";

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/ganadores-adicionales">,
) {
  try {
    const actor = await requirePermission("SORTEOS_EJECUTAR");
    const { id, sorteoId } = sorteoIdParamsSchema.parse(await context.params);
    const raw = await request.text();
    const input = ejecutarGanadoresAdicionalesSchema.parse(
      raw ? JSON.parse(raw) : {},
    );
    return ok(
      await agregarGanadoresAdicionales(id, sorteoId, input, actor?.username),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
