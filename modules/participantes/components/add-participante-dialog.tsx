"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CandidatoSearch } from "@/modules/participantes/components/candidato-search";

export function AddParticipanteDialog({ eventoId }: { eventoId: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <UserPlus className="size-4" />
        Añadir participante
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Añadir participante</DialogTitle>
          <DialogDescription>
            Busca empleados activos de las empresas habilitadas
          </DialogDescription>
        </DialogHeader>
        <CandidatoSearch eventoId={eventoId} mode="add" />
      </DialogContent>
    </Dialog>
  );
}
