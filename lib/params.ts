/**
 * Normaliza searchParams de Next (string | string[] | undefined)
 * a un objeto plano de strings, tomando el primer valor de cada clave.
 */
export function firstValues(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined) out[key] = v;
  }
  return out;
}
