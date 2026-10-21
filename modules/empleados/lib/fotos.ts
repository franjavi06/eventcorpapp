import fs from "node:fs/promises";
import path from "node:path";

import { ValidationError } from "@/lib/errors";

const SAFE_SEGMENT_RE = /^[A-Za-z0-9._-]{1,40}$/;

const IMAGE_EXTENSIONS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function getFotosBaseDir(): string {
  return process.env.FOTOS_DIR ?? path.join(process.cwd(), "public", "fotos");
}

export function sanitizeFotoSegment(raw: string, label = "código"): string {
  const clean = raw.trim();
  if (
    !clean ||
    clean === "." ||
    clean === ".." ||
    clean.includes("..") ||
    !SAFE_SEGMENT_RE.test(clean)
  ) {
    throw new ValidationError(`Formato inválido para ${label}`);
  }
  return clean;
}

export function getEmpresaFotoDir(empresaCodigo: string): string {
  const safeEmpresa = sanitizeFotoSegment(empresaCodigo, "código de empresa");
  return path.join(getFotosBaseDir(), safeEmpresa);
}

export async function ensureEmpresaFotoDir(
  empresaCodigo: string,
): Promise<string> {
  const dir = getEmpresaFotoDir(empresaCodigo);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function renameEmpresaFotoDir(
  oldCodigo: string,
  newCodigo: string,
): Promise<void> {
  if (oldCodigo.trim() === newCodigo.trim()) {
    await ensureEmpresaFotoDir(newCodigo);
    return;
  }
  const oldDir = getEmpresaFotoDir(oldCodigo);
  const newDir = getEmpresaFotoDir(newCodigo);
  try {
    await fs.access(oldDir);
    await fs.mkdir(path.dirname(newDir), { recursive: true });
    await fs.rename(oldDir, newDir);
  } catch {
    await ensureEmpresaFotoDir(newCodigo);
  }
}

export async function saveEmpleadoFoto(
  empresaCodigo: string,
  empleadoCodigo: string,
  buffer: Buffer,
  ext = ".jpg",
): Promise<string> {
  const safeEmpleado = sanitizeFotoSegment(
    empleadoCodigo,
    "código de empleado",
  );
  const normalizedExt = ext.toLowerCase();
  const finalExt = normalizedExt in IMAGE_EXTENSIONS ? normalizedExt : ".jpg";
  const dir = await ensureEmpresaFotoDir(empresaCodigo);

  // Eliminar fotos previas del mismo código (cualquier extensión o mayúscula/minúscula)
  try {
    const entries = await fs.readdir(dir);
    const targetLower = safeEmpleado.toLowerCase();
    await Promise.all(
      entries
        .filter((name) => {
          const parsed = path.parse(name);
          return (
            parsed.name.toLowerCase() === targetLower &&
            parsed.ext.toLowerCase() in IMAGE_EXTENSIONS
          );
        })
        .map((name) => fs.unlink(path.join(dir, name)).catch(() => undefined)),
    );
  } catch {
    // carpeta recién creada
  }

  const filePath = path.join(dir, `${safeEmpleado}${finalExt}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function findEmpleadoFotoFile(
  empresaCodigo: string,
  empleadoCodigo: string,
): Promise<{ filePath: string; contentType: string } | null> {
  const safeEmpleado = sanitizeFotoSegment(
    empleadoCodigo,
    "código de empleado",
  );
  const dir = getEmpresaFotoDir(empresaCodigo);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }

  const targetLower = safeEmpleado.toLowerCase();
  const match = entries.find((name) => {
    const parsed = path.parse(name);
    return (
      parsed.name.toLowerCase() === targetLower &&
      parsed.ext.toLowerCase() in IMAGE_EXTENSIONS
    );
  });

  if (!match) return null;
  const ext = path.extname(match).toLowerCase();
  return {
    filePath: path.join(dir, match),
    contentType: IMAGE_EXTENSIONS[ext] ?? "image/jpeg",
  };
}
