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

const LOGO_EXTENSIONS: Record<string, string> = {
  ...IMAGE_EXTENSIONS,
  ".svg": "image/svg+xml",
};

const RESERVED_LOGO_BASENAME = "logo";

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

/**
 * Clave canónica de comparación para códigos de empleado:
 * - minúsculas y sin espacios extremos
 * - si es numérico (ej. "00033", "0033", "33"), elimina ceros a la izquierda
 */
export function normalizeCodigoKey(raw: string): string {
  const clean = raw.trim().toLowerCase();
  if (/^\d+$/.test(clean)) {
    return clean.replace(/^0+/, "") || "0";
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

  // Eliminar fotos previas del mismo código (incluyendo variantes con/sin ceros a la izquierda)
  try {
    const entries = await fs.readdir(dir);
    const targetKey = normalizeCodigoKey(safeEmpleado);
    await Promise.all(
      entries
        .filter((name) => {
          const parsed = path.parse(name);
          return (
            normalizeCodigoKey(parsed.name) === targetKey &&
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
  if (targetLower === RESERVED_LOGO_BASENAME) return null;
  const targetKey = normalizeCodigoKey(safeEmpleado);
  const validEntries = entries.filter((name) => {
    const parsed = path.parse(name);
    return (
      parsed.name.toLowerCase() !== RESERVED_LOGO_BASENAME &&
      parsed.ext.toLowerCase() in IMAGE_EXTENSIONS
    );
  });

  const exactMatch = validEntries.find(
    (name) => path.parse(name).name.toLowerCase() === targetLower,
  );
  const match =
    exactMatch ??
    validEntries.find(
      (name) => normalizeCodigoKey(path.parse(name).name) === targetKey,
    );

  if (!match) return null;
  const ext = path.extname(match).toLowerCase();
  return {
    filePath: path.join(dir, match),
    contentType: IMAGE_EXTENSIONS[ext] ?? "image/jpeg",
  };
}

export async function saveEmpresaLogo(
  empresaCodigo: string,
  buffer: Buffer,
  ext = ".png",
): Promise<string> {
  const normalizedExt = ext.toLowerCase();
  const finalExt = normalizedExt in LOGO_EXTENSIONS ? normalizedExt : ".png";
  const dir = await ensureEmpresaFotoDir(empresaCodigo);
  const safeEmpresaLower = sanitizeFotoSegment(
    empresaCodigo,
    "código de empresa",
  ).toLowerCase();

  try {
    const entries = await fs.readdir(dir);
    await Promise.all(
      entries
        .filter((name) => {
          const parsed = path.parse(name);
          const base = parsed.name.toLowerCase();
          return (
            (base === RESERVED_LOGO_BASENAME || base === safeEmpresaLower) &&
            parsed.ext.toLowerCase() in LOGO_EXTENSIONS
          );
        })
        .map((name) => fs.unlink(path.join(dir, name)).catch(() => undefined)),
    );
  } catch {
    // carpeta recién creada
  }

  const filePath = path.join(dir, `${RESERVED_LOGO_BASENAME}${finalExt}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function findEmpresaLogoFile(
  empresaCodigo: string,
): Promise<{ filePath: string; contentType: string } | null> {
  const safeEmpresa = sanitizeFotoSegment(empresaCodigo, "código de empresa");
  const safeLower = safeEmpresa.toLowerCase();
  const dir = getEmpresaFotoDir(safeEmpresa);

  try {
    const entries = await fs.readdir(dir);
    const valid = entries.filter(
      (name) => path.extname(name).toLowerCase() in LOGO_EXTENSIONS,
    );
    const logoEntry =
      valid.find(
        (name) => path.parse(name).name.toLowerCase() === RESERVED_LOGO_BASENAME,
      ) ??
      valid.find((name) => path.parse(name).name.toLowerCase() === safeLower);
    if (logoEntry) {
      const ext = path.extname(logoEntry).toLowerCase();
      return {
        filePath: path.join(dir, logoEntry),
        contentType: LOGO_EXTENSIONS[ext] ?? "image/png",
      };
    }
  } catch {
    // puede no existir la subcarpeta aún
  }

  // Fallback: archivo {empresaCodigo}.{ext} en la raíz public/fotos/
  try {
    const rootDir = getFotosBaseDir();
    const rootEntries = await fs.readdir(rootDir);
    const rootMatch = rootEntries.find((name) => {
      const parsed = path.parse(name);
      return (
        parsed.name.toLowerCase() === safeLower &&
        parsed.ext.toLowerCase() in LOGO_EXTENSIONS
      );
    });
    if (rootMatch) {
      const ext = path.extname(rootMatch).toLowerCase();
      return {
        filePath: path.join(rootDir, rootMatch),
        contentType: LOGO_EXTENSIONS[ext] ?? "image/png",
      };
    }
  } catch {
    // raíz no existe
  }

  return null;
}
