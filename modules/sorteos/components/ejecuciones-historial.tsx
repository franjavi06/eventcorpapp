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
                      e.estado === "FALLIDA"
                        ? "destructive"
                        : e.estado === "PARCIAL"
                          ? "outline"
                          : "default"
                    }
                    className={
                      e.estado === "PARCIAL"
                        ? "border-amber-500/50 text-amber-600"
                        : undefined
                    }
                  >
                    {e.estado}
                  </Badge>
                  {e.esAdicional && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-600"
                    >
                      Adicional
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(e.ejecutadoAt)}
                  </span>
                  <span className="text-sm">
                    {e.totalCandidatos} candidatos ·{" "}
                    {e.estado === "PARCIAL"
                      ? `${e.ganadores.length} de ${e.cantidadSolicitada} adjudicados`
                      : `${e.cantidadSolicitada} solicitados`}
                  </span>
                  {e.ejecutadoPor && (
                    <span className="text-sm text-muted-foreground">
                      por {e.ejecutadoPor}
                    </span>
                  )}
                  {e.motivo && (
                    <span className="text-xs text-muted-foreground">
                      · {e.motivo}
                    </span>
                  )}
                </div>
                {e.error && (
                  <p
                    className={`mt-1 text-sm ${e.estado === "PARCIAL" ? "text-amber-600" : "text-destructive"}`}
                  >
                    {e.error}
                  </p>
                )}
                {e.ganadores.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t pt-2">
                    {e.ganadores.map((g) => {
                      const emp = g.participante.empleado;
                      const cargo = [emp.puesto, emp.departamento]
                        .filter(Boolean)
                        .join(" · ");
                      const ausente = g.estado === "AUSENTE";
                      const reemplazadoDe = g.reemplazaA?.participante.empleado;
                      return (
                        <li
                          key={g.id}
                          className={`text-sm ${ausente ? "text-muted-foreground line-through decoration-rose-500/50" : ""}`}
                        >
                          <span className="font-mono text-muted-foreground">
                            #{g.posicion}
                          </span>{" "}
                          <span className="font-mono">{emp.codigo}</span> —{" "}
                          {emp.nombres} {emp.apellidos}
                          {cargo ? (
                            <span className="text-muted-foreground no-underline">
                              {" "}
                              · {cargo}
                            </span>
                          ) : null}{" "}
                          ({emp.empresa.nombre})
                          {ausente ? (
                            <span className="ml-2 inline-flex items-center gap-1 no-underline">
                              <Badge variant="destructive">No presente</Badge>
                              {g.motivoAusencia && (
                                <span className="text-xs">
                                  · {g.motivoAusencia}
                                </span>
                              )}
                            </span>
                          ) : reemplazadoDe ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (reemplazo de {reemplazadoDe.nombres}{" "}
                              {reemplazadoDe.apellidos})
                            </span>
                          ) : null}
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
