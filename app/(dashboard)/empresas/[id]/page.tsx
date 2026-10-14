import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { idParamSchema } from "@/lib/validations/common";
import { EmpresaForm } from "@/modules/empresas/components/empresa-form";
import { empresaRepository } from "@/modules/empresas/repositories/empresa.repository";

async function EmpresaDetail({
  params,
}: {
  params: PageProps<"/empresas/[id]">["params"];
}) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const empresa = await empresaRepository.findById(parsed.data.id);
  if (!empresa) notFound();

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {empresa.nombre}
        </h1>
        <Badge variant={empresa.activo ? "default" : "secondary"}>
          {empresa.activo ? "Activa" : "Inactiva"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">Código {empresa.codigo}</p>
      <EmpresaForm
        empresaId={empresa.id}
        defaultValues={{
          codigo: empresa.codigo,
          nombre: empresa.nombre,
          clasificacion: empresa.clasificacion ?? "",
          ubicacion: empresa.ubicacion ?? "",
        }}
      />
    </>
  );
}

export default function EmpresaDetailPage({
  params,
}: PageProps<"/empresas/[id]">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-80 w-full max-w-lg" />}>
        <EmpresaDetail params={params} />
      </Suspense>
    </div>
  );
}
