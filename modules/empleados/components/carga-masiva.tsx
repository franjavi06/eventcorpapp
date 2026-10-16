"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
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

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CargaMasiva({ empresas }: { empresas: EmpresaOption[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [empresaId, setEmpresaId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const [pending, startTransition] = useTransition();

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Archivo de carga</CardTitle>
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
    </div>
  );
}
