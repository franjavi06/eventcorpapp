import { Instructivo } from "@/modules/ayuda/components/instructivo";

export const metadata = { title: "Ayuda" };

export default function AyudaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Instructivo de uso
        </h1>
        <p className="text-sm text-muted-foreground">
          Guía paso a paso del flujo completo de EventCorpApp: empresas,
          empleados, eventos, asistencia y sorteos.
        </p>
      </div>
      <Instructivo />
    </div>
  );
}
