import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClipboardCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { idParamSchema } from "@/lib/validations/common";
import { EventoEmpresas } from "@/modules/eventos/components/evento-empresas";
import { EventoForm } from "@/modules/eventos/components/evento-form";
import {
  getEvento,
  listEmpresasDisponibles,
} from "@/modules/eventos/services/evento.service";

async function EventoDetail({
  params,
}: {
  params: PageProps<"/eventos/[id]">["params"];
}) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const evento = await getEvento(parsed.data.id).catch(() => null);
  if (!evento) notFound();

  const disponibles = await listEmpresasDisponibles(evento.id);

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {evento.nombre}
        </h1>
        <Badge>{evento.estado}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {evento.codigo} · {formatDateTime(evento.fechaInicio)} →{" "}
        {formatDateTime(evento.fechaFin)}
        {evento.ubicacion ? ` · ${evento.ubicacion}` : ""}
      </p>

      <EventoForm
        eventoId={evento.id}
        defaultValues={{
          codigo: evento.codigo,
          nombre: evento.nombre,
          descripcion: evento.descripcion ?? "",
          ubicacion: evento.ubicacion ?? "",
          fechaInicio: toDateTimeLocal(evento.fechaInicio),
          fechaFin: toDateTimeLocal(evento.fechaFin),
          estado: evento.estado,
        }}
      />

      <Separator />

      <EventoEmpresas
        eventoId={evento.id}
        asociadas={evento.empresas.map((ee) => ee.empresa)}
        disponibles={disponibles}
      />

      <Separator />

      <div className="flex gap-3">
        <Link
          href={`/eventos/${evento.id}/participantes`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Users className="size-4" />
          Participantes
        </Link>
        <Link
          href={`/eventos/${evento.id}/check-in`}
          className={buttonVariants({ variant: "outline" })}
        >
          <ClipboardCheck className="size-4" />
          Check-in
        </Link>
      </div>
    </>
  );
}

export default function EventoDetailPage({
  params,
}: PageProps<"/eventos/[id]">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-2xl" />}>
        <EventoDetail params={params} />
      </Suspense>
    </div>
  );
}
