"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type ActivoToggleProps = {
  id: string;
  activo: boolean;
  /** Endpoint base, ej. "/api/empresas" */
  endpoint: string;
  /** Nombre legible para mensajes, ej. "la empresa ACME" */
  nombre: string;
};

export function ActivoToggle({ id, activo, endpoint, nombre }: ActivoToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const accion = activo ? "desactivar" : "reactivar";

  function confirm() {
    startTransition(async () => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activo: !activo }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message ?? `No se pudo ${accion} ${nombre}`);
        return;
      }
      toast.success(
        activo ? `${nombre} desactivado` : `${nombre} reactivado`,
      );
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant={activo ? "outline" : "secondary"} size="sm" />
        }
      >
        {activo ? "Desactivar" : "Reactivar"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿{activo ? "Desactivar" : "Reactivar"} {nombre}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activo
              ? "El registro se conserva pero dejará de estar disponible para nuevas operaciones."
              : "El registro volverá a estar disponible."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={pending}>
            {pending ? "Guardando…" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
