import { handleApiError, ok, parseJson } from "@/lib/api";
import {
  createSessionToken,
  requestIsSecure,
  sessionCookieOptions,
} from "@/modules/auth/lib/session";
import { loginSchema } from "@/modules/auth/schemas/usuario.schema";
import { loginUsuario } from "@/modules/auth/services/auth.service";

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, loginSchema);
    const user = await loginUsuario(input);
    const token = createSessionToken({
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      roles: user.roles,
    });
    const res = ok(user);
    res.cookies.set({
      ...sessionCookieOptions(undefined, requestIsSecure(request)),
      value: token,
    });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
