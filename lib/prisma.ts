import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaCtor?: typeof PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está definida. Copia .env.example a .env y configura la conexión a PostgreSQL.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// Tras `prisma generate`, este módulo se recarga con una clase nueva pero el
// cliente cacheado en globalThis sigue siendo del schema anterior (queries con
// argumentos desconocidos). Si la clase cambió, descartar la instancia vieja.
if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaCtor !== PrismaClient
) {
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaCtor = PrismaClient;
}
