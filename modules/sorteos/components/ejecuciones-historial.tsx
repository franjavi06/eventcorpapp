import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { listEjecuciones } from "@/modules/sorteos/services/ejecucion.service";

export async function EjecucionesHistorial({ sorteoId }: { sorteoId: string }) {
  const ejecuciones = await listEjecuciones(sorteoId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial de ejecuciones</CardTitle>
        <CardDescription>
          Cada ejecución conserva su configuración y resultados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ejecuciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este sorteo aún no se ha ejecutado.
          </p>
        ) : (
          <ul className="space-y-4">
            {ejecuciones.map((e) => (
              <li key={e.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      e.estado === "COMPLETADA" ? "default" : "destructive"
                    }
                  >
                    {e.estado}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(e.ejecutadoAt)}
                  </span>
                  <span className="text-sm">
                    {e.totalCandidatos} candidatos · {e.cantidadSolicitada}{" "}
                    solicitados
                  </span>
                  {e.ejecutadoPor && (
                    <span className="text-sm text-muted-foreground">
                      por {e.ejecutadoPor}
                    </span>
                  )}
                </div>
                {e.error && (
                  <p className="mt-1 text-sm text-destructive">{e.error}</p>
                )}
                {e.ganadores.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t pt-2">
                    {e.ganadores.map((g) => {
                      const emp = g.participante.empleado;
                      const cargo = [emp.puesto, emp.departamento]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li key={g.id} className="text-sm">
                          <span className="font-mono">{emp.codigo}</span> —{" "}
                          {emp.nombres} {emp.apellidos}
                          {cargo ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {cargo}
                            </span>
                          ) : null}{" "}
                          ({emp.empresa.nombre})
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
