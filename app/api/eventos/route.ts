import { handleApiError, ok, parseJson } from "@/lib/api";
import {
  eventoCreateSchema,
  eventoListQuerySchema,
} from "@/modules/eventos/schemas/evento.schema";
import {
  createEvento,
  listEventos,
} from "@/modules/eventos/services/evento.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = eventoListQuerySchema.parse(
      Object.fromEntries(searchParams),
    );
    return ok(await listEventos(query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, eventoCreateSchema);
    return ok(await createEvento(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
