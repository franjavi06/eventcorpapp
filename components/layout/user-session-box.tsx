"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type SessionUser = {
  id: string;
  username: string;
  nombre: string;
  roles: string[];
};

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  OPERADOR_SORTEOS: "Operador Sorteos",
  OPERADOR_CHECKIN: "Operador Check-in",
  CONSULTA: "Consulta",
};

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserSessionBox() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!active) return;
        setUser(body?.data?.user ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function logout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.success("Sesión cerrada");
      router.push("/login");
      router.refresh();
    });
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-sidebar-border p-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-600 text-xs font-bold text-white">
          EC
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            Cargando sesión…
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            EventCorpApp
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center justify-between gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2.5 text-xs font-semibold text-indigo-500 transition-colors hover:bg-indigo-500/20"
      >
        <span className="flex items-center gap-2">
          <LogIn className="size-4" />
          Iniciar sesión
        </span>
        <ShieldCheck className="size-4" />
      </Link>
    );
  }

  const rolPrincipal = user.roles[0] ? (ROL_LABEL[user.roles[0]] ?? user.roles[0]) : "Usuario";

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-sidebar-border p-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-600 text-xs font-bold text-white">
          {getInitials(user.nombre)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            {user.nombre}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {rolPrincipal} · @{user.username}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        title="Cerrar sesión"
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
