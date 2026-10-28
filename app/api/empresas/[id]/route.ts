import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { requirePermission } from "@/modules/auth/services/auth.service";
import { empresaUpdateSchema } from "@/modules/empresas/schemas/empresa.schema";
import {
  getEmpresa,
  updateEmpresa,
} from "@/modules/empresas/services/empresa.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/empresas/[id]">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    return ok(await getEmpresa(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/empresas/[id]">,
) {
  try {
    await requirePermission("EMPRESAS_WRITE");
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, empresaUpdateSchema);
    return ok(await updateEmpresa(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}
