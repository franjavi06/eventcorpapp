import { connection } from "next/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { UsuariosManager } from "@/modules/auth/components/usuarios-manager";
import {
  CATALOGO_ROLES,
  listUsuarios,
} from "@/modules/auth/services/auth.service";

export const metadata = { title: "Usuarios y Roles" };

async function UsuariosContent() {
  await connection();
  const usuarios = await listUsuarios();
  return (
    <UsuariosManager usuarios={usuarios} rolesCatalogo={CATALOGO_ROLES} />
  );
}

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Usuarios y Roles
        </h1>
        <p className="text-sm text-muted-foreground">
          Administración de cuentas de acceso y permisos operativos (RBAC).
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <UsuariosContent />
      </Suspense>
    </div>
  );
}
