"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SORTEO_ESTADOS,
  sorteoCreateSchema,
} from "@/modules/sorteos/schemas/sorteo.schema";

type FormInput = z.input<typeof sorteoCreateSchema>;
type FormOutput = z.output<typeof sorteoCreateSchema>;

type SorteoFormProps = {
  eventoId: string;
  sorteoId?: string;
  defaultValues?: Partial<FormInput>;
};

const ESTADO_LABELS: Record<(typeof SORTEO_ESTADOS)[number], string> = {
  BORRADOR: "Borrador",
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const inputCls =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SorteoForm({ eventoId, sorteoId, defaultValues }: SorteoFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(sorteoCreateSchema),
    defaultValues: {
      estado: "BORRADOR",
      asistenciaObligatoria: true,
      orden: 0,
      cantidadGanadores: 1,
      ...defaultValues,
    },
  });

  async function onSubmit(values: FormOutput) {
    const res = await fetch(
      sorteoId
        ? `/api/eventos/${eventoId}/sorteos/${sorteoId}`
        : `/api/eventos/${eventoId}/sorteos`,
      {
        method: sorteoId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const body = await res.json();
    if (!res.ok) {
      toast.error(body.error?.message ?? "No se pudo guardar el sorteo");
      return;
    }
    toast.success(sorteoId ? "Sorteo actualizado" : "Sorteo creado");
    if (sorteoId) {
      router.refresh();
    } else {
      router.push(`/eventos/${eventoId}/sorteos/${body.data.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
          <Input
            id="nombre"
            placeholder="Sorteo de fin de año"
            aria-invalid={!!errors.nombre}
            {...register("nombre")}
          />
          <FieldError errors={errors.nombre ? [errors.nombre] : []} />
        </Field>
        <Field>
          <FieldLabel htmlFor="descripcion">Descripción</FieldLabel>
          <Textarea id="descripcion" rows={2} {...register("descripcion")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="cantidadGanadores">Ganadores</FieldLabel>
            <Input
              id="cantidadGanadores"
              type="number"
              min={1}
              aria-invalid={!!errors.cantidadGanadores}
              {...register("cantidadGanadores")}
            />
            <FieldError
              errors={errors.cantidadGanadores ? [errors.cantidadGanadores] : []}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="orden">Orden</FieldLabel>
            <Input id="orden" type="number" {...register("orden")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="estado">Estado</FieldLabel>
            <select id="estado" className={inputCls} {...register("estado")}>
              {SORTEO_ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABELS[e]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("asistenciaObligatoria")} />
            Asistencia obligatoria para participar en el sorteo
          </label>
          <FieldError
            errors={
              errors.asistenciaObligatoria ? [errors.asistenciaObligatoria] : []
            }
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando…"
              : sorteoId
                ? "Guardar"
                : "Crear sorteo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/eventos/${eventoId}/sorteos`)}
          >
            Cancelar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
