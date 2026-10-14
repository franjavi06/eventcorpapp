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
  EVENTO_ESTADOS,
  eventoCreateSchema,
} from "@/modules/eventos/schemas/evento.schema";

type FormInput = z.input<typeof eventoCreateSchema>;
type FormOutput = z.output<typeof eventoCreateSchema>;

type EventoFormProps = {
  eventoId?: string;
  defaultValues?: Partial<FormInput>;
};

const ESTADO_LABELS: Record<(typeof EVENTO_ESTADOS)[number], string> = {
  BORRADOR: "Borrador",
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export function EventoForm({ eventoId, defaultValues }: EventoFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(eventoCreateSchema),
    defaultValues: { estado: "BORRADOR", ...defaultValues },
  });

  async function onSubmit(values: FormOutput) {
    const res = await fetch(
      eventoId ? `/api/eventos/${eventoId}` : "/api/eventos",
      {
        method: eventoId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const body = await res.json();
    if (!res.ok) {
      if (body.error?.code === "CONFLICT") {
        setError("codigo", { message: body.error.message });
      }
      if (body.error?.code === "VALIDATION") {
        setError("fechaFin", { message: body.error.message });
      }
      toast.error(body.error?.message ?? "No se pudo guardar el evento");
      return;
    }
    toast.success(eventoId ? "Evento actualizado" : "Evento creado");
    router.push("/eventos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="codigo">Código</FieldLabel>
            <Input
              id="codigo"
              placeholder="EVT-2026"
              aria-invalid={!!errors.codigo}
              {...register("codigo")}
            />
            <FieldError errors={errors.codigo ? [errors.codigo] : []} />
          </Field>
          <Field>
            <FieldLabel htmlFor="estado">Estado</FieldLabel>
            <select
              id="estado"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...register("estado")}
            >
              {EVENTO_ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABELS[e]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
          <Input
            id="nombre"
            placeholder="Fiesta de fin de año"
            aria-invalid={!!errors.nombre}
            {...register("nombre")}
          />
          <FieldError errors={errors.nombre ? [errors.nombre] : []} />
        </Field>
        <Field>
          <FieldLabel htmlFor="descripcion">Descripción</FieldLabel>
          <Textarea id="descripcion" rows={3} {...register("descripcion")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ubicacion">Ubicación</FieldLabel>
          <Input
            id="ubicacion"
            placeholder="Salón principal, planta 3"
            {...register("ubicacion")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="fechaInicio">Fecha y hora de inicio</FieldLabel>
            <Input
              id="fechaInicio"
              type="datetime-local"
              aria-invalid={!!errors.fechaInicio}
              {...register("fechaInicio")}
            />
            <FieldError
              errors={errors.fechaInicio ? [errors.fechaInicio] : []}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="fechaFin">Fecha y hora de fin</FieldLabel>
            <Input
              id="fechaFin"
              type="datetime-local"
              aria-invalid={!!errors.fechaFin}
              {...register("fechaFin")}
            />
            <FieldError errors={errors.fechaFin ? [errors.fechaFin] : []} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando…"
              : eventoId
                ? "Guardar"
                : "Crear evento"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/eventos")}
          >
            Cancelar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
