import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ database: "up" });
  } catch (error) {
    console.error("[health] conexión a DB fallida:", error);
    return fail("DB_UNAVAILABLE", "No se pudo conectar a la base de datos", 503);
  }
}
