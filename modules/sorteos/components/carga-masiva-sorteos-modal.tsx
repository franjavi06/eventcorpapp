"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, FileSpreadsheet, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RowDraft = {
  id: string;
  nombre: string;
  cantidadGanadores: string;
  descripcion: string;
};

function newRow(nombre = "", cantidadGanadores = "1"): RowDraft {
  return {
    id: Math.random().toString(36).slice(2, 10),
    nombre,
    cantidadGanadores,
    descripcion: "",
  };
}

export function CargaMasivaSorteosModal({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<"manual" | "excel">("manual");
  const [rows, setRows] = useState<RowDraft[]>(() => [
    newRow("", "1"),
    newRow("", "1"),
    newRow("", "1"),
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [estado, setEstado] = useState<"BORRADOR" | "ACTIVO">("BORRADOR");
  const [asistenciaObligatoria, setAsistenciaObligatoria] = useState(true);
  const [aplicarAntiguedad, setAplicarAntiguedad] = useState(false);
  const [antiguedadMeses, setAntiguedadMeses] = useState("6");
  const [pending, startTransition] = useTransition();

  function updateRow(id: string, patch: Partial<RowDraft>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, newRow("", "1")]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function submitManual() {
    const validas = rows
      .map((r) => ({
        nombre: r.nombre.trim(),
        cantidadGanadores: Number(r.cantidadGanadores),
        descripcion: r.descripcion.trim() || null,
      }))
      .filter((r) => r.nombre.length > 0);

    if (validas.length === 0) {
      toast.error("Ingrese al menos un sorteo con nombre");
      return;
    }

    for (const r of validas) {
      if (!Number.isInteger(r.cantidadGanadores) || r.cantidadGanadores < 1) {
        toast.error(
          `La cantidad de ganadores para "${r.nombre}" debe ser un entero mayor que 0`,
        );
        return;
      }
    }

    startTransition(async () => {
      const res = await fetch(`/api/eventos/${eventoId}/sorteos/carga`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: validas,
          estado,
          asistenciaObligatoria,
          antiguedadMinimaMeses: aplicarAntiguedad
            ? Number(antiguedadMeses) || 6
            : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudieron crear los sorteos");
        return;
      }
      toast.success(`Se crearon ${body.data.creados} sorteo(s)`);
      setOpen(false);
      setRows([newRow("", "1"), newRow("", "1"), newRow("", "1")]);
      router.refresh();
    });
  }

  function submitExcel() {
    if (!file) {
      toast.error("Seleccione un archivo Excel (.xlsx)");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("estado", estado);
      formData.append("asistenciaObligatoria", String(asistenciaObligatoria));
      if (aplicarAntiguedad) {
        formData.append(
          "antiguedadMinimaMeses",
          String(Number(antiguedadMeses) || 6),
        );
      }

      const res = await fetch(`/api/eventos/${eventoId}/sorteos/carga`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo importar el archivo");
        return;
      }
      toast.success(`Se importaron ${body.data.creados} sorteo(s)`);
      setOpen(false);
      setFile(null);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Carga masiva
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carga masiva de sorteos</DialogTitle>
            <DialogDescription>
              Cree varios sorteos de una sola vez indicando nombre y cantidad de
              ganadores, o subiendo un archivo Excel (.xlsx).
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b pb-3">
            <Button
              type="button"
              size="sm"
              variant={modo === "manual" ? "default" : "outline"}
              onClick={() => setModo("manual")}
            >
              Captura rápida en tabla
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modo === "excel" ? "default" : "outline"}
              onClick={() => setModo("excel")}
            >
              <FileSpreadsheet className="size-4" />
              Subir Excel (.xlsx)
            </Button>
          </div>

          {modo === "manual" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 px-1 text-xs font-semibold text-muted-foreground">
                <span className="col-span-6">Nombre del sorteo</span>
                <span className="col-span-3">Ganadores</span>
                <span className="col-span-2">Descripción (opc.)</span>
                <span className="col-span-1" />
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {rows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 items-center gap-2"
                  >
                    <div className="col-span-6">
                      <Input
                        value={row.nombre}
                        onChange={(e) =>
                          updateRow(row.id, { nombre: e.target.value })
                        }
                        placeholder={`Ej. Premio #${idx + 1} ($2,500)`}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={row.cantidadGanadores}
                        onChange={(e) =>
                          updateRow(row.id, {
                            cantidadGanadores: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={row.descripcion}
                        onChange={(e) =>
                          updateRow(row.id, { descripcion: e.target.value })
                        }
                        placeholder="Opcional…"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                        aria-label="Eliminar fila"
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
              >
                <Plus className="size-4" />
                Añadir fila
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3 text-xs">
                <div>
                  <p className="font-semibold text-foreground">
                    Plantilla de Excel (.xlsx)
                  </p>
                  <p className="text-muted-foreground">
                    Columnas: <code className="font-mono">nombre</code>,{" "}
                    <code className="font-mono">cantidad_ganadores</code> y{" "}
                    <code className="font-mono">descripcion</code> (opcional).
                  </p>
                </div>
                <a
                  href={`/api/eventos/${eventoId}/sorteos/plantilla`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 font-medium hover:bg-muted"
                >
                  <Download className="size-3.5" />
                  Descargar plantilla
                </a>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="excel-sorteos-file">Archivo Excel (.xlsx)</Label>
                <Input
                  id="excel-sorteos-file"
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-xl border bg-muted/20 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="font-medium">Estado inicial:</span>
                <select
                  value={estado}
                  onChange={(e) =>
                    setEstado(e.target.value as "BORRADOR" | "ACTIVO")
                  }
                  className="h-7 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="BORRADOR">Borrador</option>
                  <option value="ACTIVO">Activo</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={asistenciaObligatoria}
                  onChange={(e) => setAsistenciaObligatoria(e.target.checked)}
                />
                <span>Asistencia obligatoria (Check-in)</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aplicarAntiguedad}
                  onChange={(e) => setAplicarAntiguedad(e.target.checked)}
                />
                <span>
                  Aplicar regla de antigüedad mínima a todos los sorteos:
                </span>
              </label>
              {aplicarAntiguedad && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={600}
                    value={antiguedadMeses}
                    onChange={(e) => setAntiguedadMeses(e.target.value)}
                    className="h-7 w-20 text-xs"
                  />
                  <span className="text-muted-foreground">meses</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={modo === "manual" ? submitManual : submitExcel}
              disabled={pending}
            >
              {pending ? "Creando sorteos…" : "Crear sorteos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
