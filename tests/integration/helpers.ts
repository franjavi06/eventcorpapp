import { prisma } from "@/lib/prisma";

/** Limpia las tablas de negocio respetando el orden de FKs. */
export async function cleanDatabase() {
  await prisma.empleado.deleteMany();
  await prisma.empresa.deleteMany();
}
