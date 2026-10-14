import { handleApiError, ok, parseJson } from "@/lib/api";
import { idParamSchema } from "@/lib/validations/common";
import { eventoEmpresaSchema } from "@/modules/eventos/schemas/evento.schema";
import {
  addEmpresaToEvento,
  getEvento,
} from "@/modules/eventos/services/evento.service";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/eventos/[id]/empresas">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    const evento = await getEvento(id);
    return ok(
      evento.empresas.map((ee) => ({
        ...ee.empresa,
        asociadaDesde: ee.createdAt,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/eventos/[id]/empresas">,
) {
  try {
    const { id } = idParamSchema.parse(await context.params);
    const input = await parseJson(request, eventoEmpresaSchema);
    return ok(await addEmpresaToEvento(id, input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
