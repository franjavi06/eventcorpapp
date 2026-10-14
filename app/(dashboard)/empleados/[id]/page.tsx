import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { idParamSchema } from "@/lib/validations/common";
import { EmpleadoForm } from "@/modules/empleados/components/empleado-form";
import { empleadoRepository } from "@/modules/empleados/repositories/empleado.repository";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

async function EmpleadoDetail({
  params,
}: {
  params: PageProps<"/empleados/[id]">["params"];
}) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const [empleado, empresas] = await Promise.all([
    empleadoRepository.findById(parsed.data.id),
    empresaRepository.findAll(),
  ]);
  if (!empleado) notFound();

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {empleado.nombres} {empleado.apellidos}
        </h1>
        <Badge variant={empleado.activo ? "default" : "secondary"}>
          {empleado.activo ? "Activo" : "Inactivo"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {empleado.empresa.codigo} — {empleado.empresa.nombre} · Código{" "}
        {empleado.codigo}
      </p>
      <EmpleadoForm
        empleadoId={empleado.id}
        empresas={empresas}
        defaultValues={{
          empresaId: empleado.empresaId,
          codigo: empleado.codigo,
          identificacion: empleado.identificacion ?? "",
          nombres: empleado.nombres,
          apellidos: empleado.apellidos,
          correo: empleado.correo,
          departamento: empleado.departamento ?? "",
          puesto: empleado.puesto ?? "",
          claseNomina: empleado.claseNomina ?? "",
          fechaIngreso: empleado.fechaIngreso.toISOString().slice(0, 10),
        }}
      />
    </>
  );
}

export default function EmpleadoDetailPage({
  params,
}: PageProps<"/empleados/[id]">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-2xl" />}>
        <EmpleadoDetail params={params} />
      </Suspense>
    </div>
  );
}
