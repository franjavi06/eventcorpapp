import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { UsuariosManager } from "@/modules/auth/components/usuarios-manager";
import {
  CATALOGO_ROLES,
  getCurrentUser,
  listUsuarios,
} from "@/modules/auth/services/auth.service";

export const metadata = { title: "Usuarios y Roles" };

async function UsuariosContent() {
  await connection();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  if (!currentUser.permisos.includes("USUARIOS_MANAGE")) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        <div className="flex items-center gap-2 font-bold">
          <ShieldAlert className="size-5" />
          Acceso restringido
        </div>
        <p className="mt-1">
          Solo los usuarios con rol <strong>Administrador</strong> pueden
          gestionar cuentas y permisos.
        </p>
      </div>
    );
  }

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
