import { Workbook } from "exceljs";

import { handleApiError, ok } from "@/lib/api";
import { BadRequestError, ValidationError } from "@/lib/errors";
import { uuidSchema } from "@/lib/validations/common";
import { extraerFilas } from "@/modules/empleados/lib/carga-columns";
import { importEmpleados } from "@/modules/empleados/services/carga.service";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const empresaId = uuidSchema.parse(formData.get("empresaId"));
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new BadRequestError("Debe adjuntar un archivo .xlsx");
    }
    if (file.size === 0) {
      throw new BadRequestError("El archivo está vacío");
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestError("El archivo supera el máximo de 5 MB");
    }

    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(await file.arrayBuffer());
    } catch {
      throw new BadRequestError(
        "No se pudo leer el archivo; verifique que sea un .xlsx válido",
      );
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestError("El archivo no contiene hojas de cálculo");
    }

    const resultado = extraerFilas(worksheet);
    if (!resultado.ok) {
      throw new ValidationError(
        `Faltan columnas obligatorias: ${resultado.faltantes.join(", ")}. ` +
          "Descargue la plantilla para ver el formato esperado.",
      );
    }

    return ok(await importEmpleados(empresaId, resultado.filas), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
