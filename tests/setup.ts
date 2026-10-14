import "dotenv/config";

// En integración se usa TEST_DATABASE_URL para no tocar la base de desarrollo.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
