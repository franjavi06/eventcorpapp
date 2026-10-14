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
import { empresaCreateSchema } from "@/modules/empresas/schemas/empresa.schema";

type FormInput = z.input<typeof empresaCreateSchema>;
type FormOutput = z.output<typeof empresaCreateSchema>;

type EmpresaFormProps = {
  empresaId?: string;
  defaultValues?: Partial<FormInput>;
};

export function EmpresaForm({ empresaId, defaultValues }: EmpresaFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(empresaCreateSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      clasificacion: "",
      ubicacion: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: FormOutput) {
    const res = await fetch(
      empresaId ? `/api/empresas/${empresaId}` : "/api/empresas",
      {
        method: empresaId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const body = await res.json();
    if (!res.ok) {
      if (body.error?.code === "CONFLICT") {
        setError("codigo", { message: body.error.message });
      }
      toast.error(body.error?.message ?? "No se pudo guardar la empresa");
      return;
    }
    toast.success(empresaId ? "Empresa actualizada" : "Empresa creada");
    router.push("/empresas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="codigo">Código</FieldLabel>
          <Input
            id="codigo"
            placeholder="ACME"
            aria-invalid={!!errors.codigo}
            {...register("codigo")}
          />
          <FieldError errors={errors.codigo ? [errors.codigo] : []} />
        </Field>
        <Field>
          <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
          <Input
            id="nombre"
            placeholder="Empresa Ejemplo S.A."
            aria-invalid={!!errors.nombre}
            {...register("nombre")}
          />
          <FieldError errors={errors.nombre ? [errors.nombre] : []} />
        </Field>
        <Field>
          <FieldLabel htmlFor="clasificacion">Clasificación</FieldLabel>
          <Input
            id="clasificacion"
            placeholder="GRUPO, AFILIADA…"
            {...register("clasificacion")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="ubicacion">Ubicación</FieldLabel>
          <Input
            id="ubicacion"
            placeholder="San Salvador"
            {...register("ubicacion")}
          />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : empresaId ? "Guardar" : "Crear empresa"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/empresas")}
          >
            Cancelar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
