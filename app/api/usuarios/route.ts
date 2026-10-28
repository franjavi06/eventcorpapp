import { handleApiError, ok, parseJson } from "@/lib/api";
import { usuarioCreateSchema } from "@/modules/auth/schemas/usuario.schema";
import {
  CATALOGO_ROLES,
  createUsuario,
  listUsuarios,
  requirePermission,
} from "@/modules/auth/services/auth.service";

export async function GET() {
  try {
    await requirePermission("USUARIOS_MANAGE");
    const usuarios = await listUsuarios();
    return ok({ usuarios, rolesCatalogo: CATALOGO_ROLES });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("USUARIOS_MANAGE");
    const input = await parseJson(request, usuarioCreateSchema);
    const creado = await createUsuario(input, actor?.username);
    return ok(creado, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
