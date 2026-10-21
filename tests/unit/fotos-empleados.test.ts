import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import {
  ensureEmpresaFotoDir,
  findEmpleadoFotoFile,
  renameEmpresaFotoDir,
  sanitizeFotoSegment,
  saveEmpleadoFoto,
} from "@/modules/empleados/lib/fotos";

describe("fotos de empleados por empresa", () => {
  let tempDir: string;
  const originalFotosDir = process.env.FOTOS_DIR;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "eventcorp-fotos-"));
    process.env.FOTOS_DIR = tempDir;
  });

  afterEach(async () => {
    if (originalFotosDir === undefined) {
      delete process.env.FOTOS_DIR;
    } else {
      process.env.FOTOS_DIR = originalFotosDir;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("crea la carpeta de la empresa y guarda/encuentra fotos case-insensitive", async () => {
    const dir = await ensureEmpresaFotoDir("ACME");
    expect(dir).toBe(path.join(tempDir, "ACME"));

    await saveEmpleadoFoto("ACME", "00033", Buffer.from("fake-jpg"), ".JPG");
    const found = await findEmpleadoFotoFile("ACME", "00033");
    expect(found).not.toBeNull();
    expect(found?.contentType).toBe("image/jpeg");

    const foundLower = await findEmpleadoFotoFile("ACME", "e-1");
    expect(foundLower).toBeNull();

    await saveEmpleadoFoto("ACME", "E-1", Buffer.from("png-bytes"), ".png");
    const matchCase = await findEmpleadoFotoFile("ACME", "e-1");
    expect(matchCase?.contentType).toBe("image/png");
  });

  it("permite el mismo código de empleado en empresas distintas sin colisión", async () => {
    await saveEmpleadoFoto("ACME", "001", Buffer.from("foto-acme"), ".jpg");
    await saveEmpleadoFoto("BETA", "001", Buffer.from("foto-beta"), ".jpg");

    const acme = await findEmpleadoFotoFile("ACME", "001");
    const beta = await findEmpleadoFotoFile("BETA", "001");
    expect(acme).not.toBeNull();
    expect(beta).not.toBeNull();
    expect(await fs.readFile(acme!.filePath, "utf8")).toBe("foto-acme");
    expect(await fs.readFile(beta!.filePath, "utf8")).toBe("foto-beta");
  });

  it("renombra la carpeta cuando cambia el código de la empresa", async () => {
    await saveEmpleadoFoto("VIEJA", "001", Buffer.from("contenido"), ".jpg");
    await renameEmpresaFotoDir("VIEJA", "NUEVA");

    const enNueva = await findEmpleadoFotoFile("NUEVA", "001");
    expect(enNueva).not.toBeNull();
  });

  it("rechaza segmentos inseguros (path traversal)", () => {
    expect(() => sanitizeFotoSegment("../etc")).toThrow(ValidationError);
    expect(() => sanitizeFotoSegment("a/b")).toThrow(ValidationError);
    expect(() => sanitizeFotoSegment("..")).toThrow(ValidationError);
  });
});
