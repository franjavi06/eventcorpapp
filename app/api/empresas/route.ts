import { handleApiError, ok, parseJson } from "@/lib/api";
import { requirePermission } from "@/modules/auth/services/auth.service";
import {
  empresaCreateSchema,
  empresaListQuerySchema,
} from "@/modules/empresas/schemas/empresa.schema";
import {
  createEmpresa,
  listEmpresas,
} from "@/modules/empresas/services/empresa.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = empresaListQuerySchema.parse(
      Object.fromEntries(searchParams),
    );
    return ok(await listEmpresas(query));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission("EMPRESAS_WRITE");
    const input = await parseJson(request, empresaCreateSchema);
    return ok(await createEmpresa(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
