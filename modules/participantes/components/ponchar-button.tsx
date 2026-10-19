"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function PoncharButton({
  eventoId,
  empleadoId,
}: {
  eventoId: string;
  empleadoId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function ponchar() {
    startTransition(async () => {
      const res = await fetch(`/api/eventos/${eventoId}/asistencias`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ empleadoId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo registrar");
        return;
      }
      toast.success("Asistencia registrada");
      router.refresh();
    });
  }

  return (
    <Button type="button" size="sm" onClick={ponchar} disabled={pending}>
      Ponchar
    </Button>
  );
}
