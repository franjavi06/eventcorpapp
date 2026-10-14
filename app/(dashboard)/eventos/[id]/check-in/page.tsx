import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { idParamSchema } from "@/lib/validations/common";
import { getEvento } from "@/modules/eventos/services/evento.service";
import { CandidatoSearch } from "@/modules/participantes/components/candidato-search";

async function CheckInContent({
  params,
}: {
  params: PageProps<"/eventos/[id]/check-in">["params"];
}) {
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const eventoId = parsed.data.id;

  const evento = await getEvento(eventoId).catch(() => null);
  if (!evento) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/eventos/${eventoId}/participantes`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Participantes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        {evento.nombre} · <span className="font-mono">{evento.codigo}</span>
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar asistencia</CardTitle>
          <CardDescription>
            Busca al empleado por código, identificación o nombre. Si aún no es
            participante, se incorpora automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CandidatoSearch eventoId={eventoId} mode="checkin" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckInPage({
  params,
}: PageProps<"/eventos/[id]/check-in">) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <CheckInContent params={params} />
    </Suspense>
  );
}
