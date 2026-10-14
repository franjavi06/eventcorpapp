import { EventoForm } from "@/modules/eventos/components/evento-form";

export const metadata = { title: "Nuevo evento" };

export default function NuevoEventoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo evento</h1>
        <p className="text-sm text-muted-foreground">
          Crea un evento corporativo; luego asocia las empresas participantes
        </p>
      </div>
      <EventoForm />
    </div>
  );
}
