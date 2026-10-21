import fs from "node:fs/promises";
import { NextResponse } from "next/server";

import {
  ensureEmpresaFotoDir,
  findEmpleadoFotoFile,
} from "@/modules/empleados/lib/fotos";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/fotos/[empresaCodigo]/[codigo]">,
) {
  try {
    const { empresaCodigo, codigo } = await context.params;
    await ensureEmpresaFotoDir(empresaCodigo).catch(() => undefined);
    const found = await findEmpleadoFotoFile(empresaCodigo, codigo);
    if (!found) {
      return new NextResponse(null, { status: 404 });
    }
    const bytes = await fs.readFile(found.filePath);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": found.contentType,
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
