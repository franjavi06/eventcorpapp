import { EmpresaForm } from "@/modules/empresas/components/empresa-form";

export const metadata = { title: "Nueva empresa" };

export default function NuevaEmpresaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva empresa</h1>
        <p className="text-sm text-muted-foreground">
          Registra una empresa del grupo empresarial
        </p>
      </div>
      <EmpresaForm />
    </div>
  );
}
