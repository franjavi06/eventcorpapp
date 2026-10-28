import { handleApiError, ok, parseJson } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  empleadoCreateSchema,
  empleadoListQuerySchema,
} from "@/modules/empleados/schemas/empleado.schema";
import {
  createEmpleado,
  listEmpleados,
} from "@/modules/empleados/services/empleado.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = empleadoListQuerySchema.parse(
      Object.fromEntries(searchParams),
    );
    return ok(await listEmpleados(query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("EMPLEADOS_WRITE");
    const input = await parseJson(request, empleadoCreateSchema);
    return ok(await createEmpleado(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
