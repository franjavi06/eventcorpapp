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
import { empleadoCreateSchema } from "@/modules/empleados/schemas/empleado.schema";

type FormInput = z.input<typeof empleadoCreateSchema>;
type FormOutput = z.output<typeof empleadoCreateSchema>;

type EmpresaOption = { id: string; codigo: string; nombre: string };

type EmpleadoFormProps = {
  empleadoId?: string;
  empresas: EmpresaOption[];
  defaultValues?: Partial<FormInput>;
};

export function EmpleadoForm({
  empleadoId,
  empresas,
  defaultValues,
}: EmpleadoFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(empleadoCreateSchema),
    defaultValues,
  });

  async function onSubmit(values: FormOutput) {
    const res = await fetch(
      empleadoId ? `/api/empleados/${empleadoId}` : "/api/empleados",
      {
        method: empleadoId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const body = await res.json();
    if (!res.ok) {
      if (body.error?.code === "CONFLICT") {
        setError("codigo", { message: body.error.message });
      }
      toast.error(body.error?.message ?? "No se pudo guardar el empleado");
      return;
    }
    toast.success(empleadoId ? "Empleado actualizado" : "Empleado creado");
    router.push("/empleados");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="empresaId">Empresa</FieldLabel>
            <select
              id="empresaId"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-invalid={!!errors.empresaId}
              {...register("empresaId")}
            >
              <option value="">Selecciona una empresa…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.nombre}
                </option>
              ))}
            </select>
            <FieldError errors={errors.empresaId ? [errors.empresaId] : []} />
          </Field>
          <Field>
            <FieldLabel htmlFor="codigo">Código</FieldLabel>
            <Input id="codigo" aria-invalid={!!errors.codigo} {...register("codigo")} />
            <FieldError errors={errors.codigo ? [errors.codigo] : []} />
          </Field>
          <Field>
            <FieldLabel htmlFor="nombres">Nombres</FieldLabel>
            <Input
              id="nombres"
              aria-invalid={!!errors.nombres}
              {...register("nombres")}
            />
            <FieldError errors={errors.nombres ? [errors.nombres] : []} />
          </Field>
          <Field>
            <FieldLabel htmlFor="apellidos">Apellidos</FieldLabel>
            <Input
              id="apellidos"
              aria-invalid={!!errors.apellidos}
              {...register("apellidos")}
            />
            <FieldError errors={errors.apellidos ? [errors.apellidos] : []} />
          </Field>
          <Field>
            <FieldLabel htmlFor="correo">Correo (opcional)</FieldLabel>
            <Input
              id="correo"
              type="email"
              aria-invalid={!!errors.correo}
              {...register("correo")}
            />
            <FieldError errors={errors.correo ? [errors.correo] : []} />
          </Field>
          <Field>
            <FieldLabel htmlFor="telefono">Teléfono (opcional)</FieldLabel>
            <Input
              id="telefono"
              placeholder="+1-809-555-1234"
              {...register("telefono")}
            />
            <FieldError errors={errors.telefono ? [errors.telefono] : []} />
          </Field>
          <Field>
            <FieldLabel htmlFor="identificacion">Identificación</FieldLabel>
            <Input id="identificacion" {...register("identificacion")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="departamento">Departamento</FieldLabel>
            <Input id="departamento" {...register("departamento")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="puesto">Puesto</FieldLabel>
            <Input id="puesto" {...register("puesto")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="zona">Zona</FieldLabel>
            <Input
              id="zona"
              placeholder="CENTRO, ORIENTE…"
              {...register("zona")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="clasificacion">Clasificación</FieldLabel>
            <Input
              id="clasificacion"
              placeholder="OPERATIVO, GERENCIAL…"
              {...register("clasificacion")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="fechaIngreso">Fecha de ingreso</FieldLabel>
            <Input
              id="fechaIngreso"
              type="date"
              aria-invalid={!!errors.fechaIngreso}
              {...register("fechaIngreso")}
            />
            <FieldError
              errors={errors.fechaIngreso ? [errors.fechaIngreso] : []}
            />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando…"
              : empleadoId
                ? "Guardar"
                : "Crear empleado"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/empleados")}
          >
            Cancelar
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
