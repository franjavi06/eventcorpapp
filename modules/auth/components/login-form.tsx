"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  initialAdminUsername?: string;
  initialAdminPassword?: string;
};

export function LoginForm({
  initialAdminUsername,
  initialAdminPassword,
}: LoginFormProps) {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identificador, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body.error?.message ?? "No se pudo iniciar sesión";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Bienvenido, ${body.data?.nombre ?? identificador}`);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30">
          <Sparkles className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            EventCorpApp
          </h1>
          <p className="text-xs font-semibold text-indigo-500">
            Acceso a Plataforma Corporativa
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="identificador" className="text-sm font-medium">
            Usuario o correo
          </label>
          <Input
            id="identificador"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="admin o admin@eventcorp.local"
            autoFocus
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          <KeyRound className="size-4" />
          {pending ? "Verificando…" : "Iniciar sesión"}
        </Button>
      </form>

      {initialAdminUsername && initialAdminPassword && (
        <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            Credenciales iniciales de administrador:
          </p>
          <p className="mt-1">
            Usuario:{" "}
            <code className="font-mono font-bold text-indigo-500">
              {initialAdminUsername}
            </code>{" "}
            · Contraseña:{" "}
            <code className="font-mono font-bold text-indigo-500">
              {initialAdminPassword}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
