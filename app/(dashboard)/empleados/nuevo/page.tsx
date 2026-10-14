import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EmpleadoForm } from "@/modules/empleados/components/empleado-form";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

export const metadata = { title: "Nuevo empleado" };

async function NuevoEmpleadoForm() {
  const empresas = await empresaRepository.findAllActive();
  return <EmpleadoForm empresas={empresas} />;
}

export default function NuevoEmpleadoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo empleado</h1>
        <p className="text-sm text-muted-foreground">
          Registra un colaborador en una empresa activa
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-2xl" />}>
        <NuevoEmpleadoForm />
      </Suspense>
    </div>
  );
}
