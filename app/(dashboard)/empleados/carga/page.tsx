import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CargaMasiva } from "@/modules/empleados/components/carga-masiva";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

export const metadata = { title: "Carga masiva de empleados" };

async function CargaContent() {
  const empresas = await empresaRepository.findAll();
  return <CargaMasiva empresas={empresas} />;
}

export default function EmpleadosCargaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Carga masiva de empleados
          </h1>
          <p className="text-sm text-muted-foreground">
            Importe colaboradores desde un archivo Excel (.xlsx)
          </p>
        </div>
        <Link
          href="/empleados"
          className={buttonVariants({ variant: "outline" })}
        >
          Volver a empleados
        </Link>
      </div>
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <CargaContent />
      </Suspense>
    </div>
  );
}
