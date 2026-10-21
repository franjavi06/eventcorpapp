"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  Download,
  FileSpreadsheet,
  FolderOpen,
  ImageUp,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EmpresaOption = { id: string; codigo: string; nombre: string };

type ResultadoCarga = {
  importados: number;
  errores: { fila: number; campo?: string; mensaje: string }[];
};

type ResultadoFotos = {
  carpeta: string;
  guardadas: number;
  empleadosCoincidentes: number;
  sinEmpleado: string[];
  errores: { archivo: string; mensaje: string }[];
};

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CargaMasiva({ empresas }: { empresas: EmpresaOption[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const fotosRef = useRef<HTMLInputElement>(null);
  const [empresaId, setEmpresaId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [pending, startTransition] = useTransition();

  const [empresaFotosId, setEmpresaFotosId] = useState("");
  const [fotosCount, setFotosCount] = useState(0);
  const [resultadoFotos, setResultadoFotos] = useState<ResultadoFotos | null>(
    null,
  );
  const [pendingFotos, startFotosTransition] = useTransition();

  const empresaFotosSeleccionada = empresas.find(
    (e) => e.id === empresaFotosId,
  );

  function importar() {
    const file = fileRef.current?.files?.[0];
    if (!empresaId) {
      toast.error("Seleccione una empresa");
      return;
    }
    if (!file) {
      toast.error("Seleccione un archivo .xlsx");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("empresaId", empresaId);
      fd.append("file", file);
      const res = await fetch("/api/empleados/carga", {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo procesar el archivo");
        return;
      }
      const r: ResultadoCarga = body.data;
      setResultado(r);
      if (r.errores.length === 0) {
        toast.success(`${r.importados} empleados importados correctamente`);
      } else {
        toast.warning(
          `${r.importados} importados, ${r.errores.length} filas con errores`,
        );
      }
      router.refresh();
    });
  }

  function subirFotos() {
    const files = fotosRef.current?.files;
    if (!empresaFotosId) {
      toast.error("Seleccione una empresa para las fotos");
      return;
    }
    if (!files || files.length === 0) {
      toast.error("Seleccione al menos una imagen");
      return;
    }

    startFotosTransition(async () => {
      const fd = new FormData();
      fd.append("empresaId", empresaFotosId);
      for (const f of Array.from(files)) {
        fd.append("files", f);
      }
      const res = await fetch("/api/empleados/fotos", {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudieron subir las fotos");
        return;
      }
      const r: ResultadoFotos = body.data;
      setResultadoFotos(r);
      if (r.errores.length === 0) {
        toast.success(
          `${r.guardadas} foto(s) guardada(s) en ${r.carpeta}`,
        );
      } else {
        toast.warning(
          `${r.guardadas} guardada(s), ${r.errores.length} con errores`,
        );
      }
      if (fotosRef.current) {
        fotosRef.current.value = "";
      }
      setFotosCount(0);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Archivo de carga (.xlsx)</CardTitle>
          <CardDescription>
            Seleccione la empresa y el archivo .xlsx. Use la plantilla para el
            formato correcto de columnas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="empresa" className="text-sm font-medium">
                Empresa destino
              </label>
              <select
                id="empresa"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className={selectClass}
              >
                <option value="">Seleccione una empresa…</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo} — {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="archivo" className="text-sm font-medium">
                Archivo .xlsx
              </label>
              <input
                ref={fileRef}
                id="archivo"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
              />
              {fileName && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileSpreadsheet className="size-3.5 text-emerald-500" />
                  {fileName}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={importar}
              disabled={pending || !empresaId || !fileName}
            >
              <Upload className="size-4" />
              {pending ? "Importando…" : "Importar empleados"}
            </Button>
            <a
              href="/api/empleados/plantilla"
              download
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm font-medium hover:bg-muted"
            >
              <Download className="size-4" />
              Descargar plantilla
            </a>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado de la carga</CardTitle>
            <CardDescription>
              <span className="font-semibold text-emerald-500">
                {resultado.importados} importados
              </span>
              {" · "}
              <span
                className={
                  resultado.errores.length > 0
                    ? "font-semibold text-destructive"
                    : "text-muted-foreground"
                }
              >
                {resultado.errores.length} con errores
              </span>
            </CardDescription>
          </CardHeader>
          {resultado.errores.length > 0 && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Fila</TableHead>
                    <TableHead className="w-40">Campo</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.errores.map((e, i) => (
                    <TableRow key={`${e.fila}-${i}`}>
                      <TableCell className="font-mono">{e.fila}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.campo ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{e.mensaje}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Carga de fotos de empleados (codigo.jpg)
          </CardTitle>
          <CardDescription>
            Cada empresa tiene su propia carpeta. Puede subir las fotos aquí
            nombradas con el código del empleado (ej.{" "}
            <span className="font-mono">00033.jpg</span>) o copiarlas
            directamente en la carpeta del servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="empresa-fotos" className="text-sm font-medium">
                Empresa destino
              </label>
              <select
                id="empresa-fotos"
                value={empresaFotosId}
                onChange={(e) => setEmpresaFotosId(e.target.value)}
                className={selectClass}
              >
                <option value="">Seleccione una empresa…</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo} — {e.nombre}
                  </option>
                ))}
              </select>
              {empresaFotosSeleccionada && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderOpen className="size-3.5 text-indigo-500" />
                  Carpeta en servidor:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    public/fotos/{empresaFotosSeleccionada.codigo}/
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="archivos-fotos" className="text-sm font-medium">
                Imágenes (.jpg, .png, .webp)
              </label>
              <input
                ref={fotosRef}
                id="archivos-fotos"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => setFotosCount(e.target.files?.length ?? 0)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
              />
              {fotosCount > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ImageUp className="size-3.5 text-indigo-500" />
                  {fotosCount} archivo(s) seleccionado(s)
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            onClick={subirFotos}
            disabled={pendingFotos || !empresaFotosId || fotosCount === 0}
          >
            <ImageUp className="size-4" />
            {pendingFotos ? "Subiendo fotos…" : "Subir fotos"}
          </Button>
        </CardContent>
      </Card>

      {resultadoFotos && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultado de carga de fotos
            </CardTitle>
            <CardDescription>
              Carpeta:{" "}
              <span className="font-mono">{resultadoFotos.carpeta}</span> ·{" "}
              <span className="font-semibold text-emerald-500">
                {resultadoFotos.guardadas} guardada(s)
              </span>{" "}
              ({resultadoFotos.empleadosCoincidentes} asociadas a empleados
              existentes)
              {resultadoFotos.sinEmpleado.length > 0 && (
                <span>
                  {" "}
                  · {resultadoFotos.sinEmpleado.length} código(s) aún sin
                  empleado registrado (
                  <span className="font-mono">
                    {resultadoFotos.sinEmpleado.slice(0, 10).join(", ")}
                    {resultadoFotos.sinEmpleado.length > 10 ? "…" : ""}
                  </span>
                  )
                </span>
              )}
            </CardDescription>
          </CardHeader>
          {resultadoFotos.errores.length > 0 && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Archivo</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultadoFotos.errores.map((e, i) => (
                    <TableRow key={`${e.archivo}-${i}`}>
                      <TableCell className="font-mono text-xs">
                        {e.archivo}
                      </TableCell>
                      <TableCell className="text-sm">{e.mensaje}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
