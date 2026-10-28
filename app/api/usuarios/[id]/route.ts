import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { usuarioUpdateSchema } from "@/modules/auth/schemas/usuario.schema";
import {
  requirePermission,
  updateUsuario,
} from "@/modules/auth/services/auth.service";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/usuarios/[id]">,
) {
  try {
    const actor = await requirePermission("USUARIOS_MANAGE");
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, usuarioUpdateSchema);
    const actualizado = await updateUsuario(
      id,
      input,
      actor?.id,
      actor?.username,
    );
    return ok(actualizado);
  } catch (error) {
    return handleApiError(error);
  }
}
