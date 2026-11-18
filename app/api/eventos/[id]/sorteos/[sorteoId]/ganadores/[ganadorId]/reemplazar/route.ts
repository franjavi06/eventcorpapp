import { handleApiError, ok } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  ganadorIdParamsSchema,
  reemplazoGanadorSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";
import { reemplazarGanadorAusente } from "@/modules/sorteos/services/ejecucion.service";

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/sorteos/[sorteoId]/ganadores/[ganadorId]/reemplazar">,
) {
  try {
    const actor = await requirePermission("SORTEOS_EJECUTAR");
    const { id, sorteoId, ganadorId } = ganadorIdParamsSchema.parse(
      await context.params,
    );
    const raw = await request.text();
    const { motivo } = reemplazoGanadorSchema.parse(
      raw ? JSON.parse(raw) : {},
    );
    return ok(
      await reemplazarGanadorAusente(
        id,
        sorteoId,
        ganadorId,
        motivo,
        actor?.username,
      ),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
