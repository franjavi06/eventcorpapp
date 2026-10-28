"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RolCodigo } from "@/modules/auth/schemas/usuario.schema";

type UsuarioItem = {
  id: string;
  username: string;
  correo: string;
  nombre: string;
  activo: boolean;
  roles: RolCodigo[];
};

type RolDef = {
  codigo: RolCodigo;
  nombre: string;
  descripcion: string;
};

type UsuariosManagerProps = {
  usuarios: UsuarioItem[];
  rolesCatalogo: RolDef[];
};

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function UsuariosManager({
  usuarios,
  rolesCatalogo,
}: UsuariosManagerProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [rolNuevo, setRolNuevo] = useState<RolCodigo>("OPERADOR_SORTEOS");
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function crearUsuario(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          correo,
          nombre,
          password,
          roles: [rolNuevo],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo crear el usuario");
        return;
      }
      toast.success(`Usuario @${body.data?.username} creado`);
      setUsername("");
      setCorreo("");
      setNombre("");
      setPassword("");
      router.refresh();
    });
  }

  function cambiarRol(usuarioId: string, rol: RolCodigo) {
    startTransition(async () => {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roles: [rol] }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo actualizar el rol");
        return;
      }
      toast.success("Rol actualizado");
      router.refresh();
    });
  }

  function toggleActivo(usuarioId: string, activoActual: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activo: !activoActual }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo cambiar el estado");
        return;
      }
      toast.success(activoActual ? "Usuario desactivado" : "Usuario activado");
      router.refresh();
    });
  }

  function guardarNuevaPassword(usuarioId: string) {
    if (resetPassword.trim().length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error?.message ?? "No se pudo cambiar la contraseña");
        return;
      }
      toast.success("Contraseña restablecida");
      setResetId(null);
      setResetPassword("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rolesCatalogo.map((r) => (
          <div key={r.codigo} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-indigo-500" />
              <span className="text-sm font-bold text-foreground">
                {r.nombre}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-indigo-500">
              {r.codigo}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {r.descripcion}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4 text-indigo-500" />
            Crear nuevo usuario
          </CardTitle>
          <CardDescription>
            Asigne credenciales de acceso y el rol operativo dentro del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={crearUsuario}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-1">
              <label htmlFor="u-username" className="text-xs font-medium">
                Usuario
              </label>
              <Input
                id="u-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jperez"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="u-nombre" className="text-xs font-medium">
                Nombre completo
              </label>
              <Input
                id="u-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="u-correo" className="text-xs font-medium">
                Correo
              </label>
              <Input
                id="u-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="jperez@empresa.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="u-password" className="text-xs font-medium">
                Contraseña (mín. 6)
              </label>
              <Input
                id="u-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="u-rol" className="text-xs font-medium">
                Rol operativo
              </label>
              <div className="flex gap-2">
                <select
                  id="u-rol"
                  value={rolNuevo}
                  onChange={(e) => setRolNuevo(e.target.value as RolCodigo)}
                  className={selectClass}
                >
                  {rolesCatalogo.map((r) => (
                    <option key={r.codigo} value={r.codigo}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={pending}>
                  Crear
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Usuarios registrados ({usuarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => {
                const rolActual = u.roles[0] ?? "CONSULTA";
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-sm">
                      @{u.username}
                    </TableCell>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell className="text-sm">{u.correo}</TableCell>
                    <TableCell>
                      <select
                        value={rolActual}
                        disabled={pending}
                        onChange={(e) =>
                          cambiarRol(u.id, e.target.value as RolCodigo)
                        }
                        aria-label={`Rol de ${u.username}`}
                        className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
                      >
                        {rolesCatalogo.map((r) => (
                          <option key={r.codigo} value={r.codigo}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      {u.activo ? (
                        <Badge>Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {resetId === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="password"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            placeholder="Nueva contraseña…"
                            className="h-8 w-40 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={pending}
                            onClick={() => guardarNuevaPassword(u.id)}
                          >
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setResetId(null);
                              setResetPassword("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResetId(u.id);
                              setResetPassword("");
                            }}
                          >
                            <KeyRound className="size-3.5" />
                            Clave
                          </Button>
                          <Button
                            type="button"
                            variant={u.activo ? "outline" : "secondary"}
                            size="sm"
                            disabled={pending}
                            onClick={() => toggleActivo(u.id, u.activo)}
                          >
                            {u.activo ? "Desactivar" : "Reactivar"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
