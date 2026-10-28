import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { empleadoUpdateSchema } from "@/modules/empleados/schemas/empleado.schema";
import {
  getEmpleado,
  updateEmpleado,
} from "@/modules/empleados/services/empleado.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/empleados/[id]">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    return ok(await getEmpleado(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/empleados/[id]">,
) {
  try {
    await requirePermission("EMPLEADOS_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, empleadoUpdateSchema);
    return ok(await updateEmpleado(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
