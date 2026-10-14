import { Suspense } from "react";
import { Building2, CalendarDays, Gift, Users } from "lucide-react";

import { DbStatus } from "@/components/dashboard/db-status";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MODULES = [
  {
    title: "Empresas",
    description: "Catálogo de empresas del grupo",
    icon: Building2,
    etapa: "Etapa 2",
  },
  {
    title: "Empleados",
    description: "Colaboradores por empresa",
    icon: Users,
    etapa: "Etapa 2",
  },
  {
    title: "Eventos",
    description: "Eventos corporativos y empresas participantes",
    icon: CalendarDays,
    etapa: "Etapa 3",
  },
  {
    title: "Sorteos",
    description: "Sorteos configurables con reglas de elegibilidad",
    icon: Gift,
    etapa: "Etapas 5–6",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Administración de eventos corporativos y sorteos
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-36 w-full max-w-sm" />}>
        <DbStatus />
      </Suspense>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map(({ title, description, icon: Icon, etapa }) => (
          <Card key={title} className="opacity-75">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{etapa}</span>
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
