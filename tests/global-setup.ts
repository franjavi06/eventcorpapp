import "dotenv/config";
import { execSync } from "node:child_process";

/**
 * Aplica las migraciones a la base de tests (TEST_DATABASE_URL)
 * antes de correr la suite de integración.
 */
export default function globalSetup() {
  if (!process.env.TEST_DATABASE_URL) {
    console.warn(
      "[tests] TEST_DATABASE_URL no definida: se omiten migraciones de test DB",
    );
    return;
  }
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      DIRECT_URL: process.env.TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
}
