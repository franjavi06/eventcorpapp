"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ImageUp } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { EmpresaLogo } from "@/components/shared/empresa-logo";
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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    } else {
      setLogoPreview(null);
    }
  }

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

    const savedId: string | undefined = body.data?.id ?? empresaId;
    if (logoFile && savedId) {
      const fd = new FormData();
      fd.append("file", logoFile);
      const logoRes = await fetch(`/api/empresas/${savedId}/logo`, {
        method: "POST",
        body: fd,
      });
      if (!logoRes.ok) {
        const logoBody = await logoRes.json().catch(() => ({}));
        toast.warning(
          logoBody.error?.message ??
            "La empresa se guardó, pero no se pudo subir el logo",
        );
      }
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
        <Field>
          <FieldLabel htmlFor="logo">Logo de la empresa (opcional)</FieldLabel>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Vista previa del logo"
                  className="size-full object-contain"
                />
              </div>
            ) : (
              <EmpresaLogo
                empresaCodigo={defaultValues?.codigo}
                nombre={defaultValues?.nombre || "Empresa"}
                size="lg"
              />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <input
                ref={logoInputRef}
                id="logo"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onLogoChange}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
              />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImageUp className="size-3.5 shrink-0 text-indigo-500" />
                <span>
                  También puede colocar{" "}
                  <span className="font-mono">
                    public/fotos/{defaultValues?.codigo || "CODIGO"}/logo.png
                  </span>
                </span>
              </p>
            </div>
          </div>
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando…"
              : empresaId
                ? "Guardar"
                : "Crear empresa"}
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
