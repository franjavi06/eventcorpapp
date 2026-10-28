import { connection } from "next/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/modules/auth/components/login-form";
import { ensureInitialAuthSeed } from "@/modules/auth/services/auth.service";

export const metadata = { title: "Iniciar sesión" };

async function LoginContent() {
  await connection();
  await ensureInitialAuthSeed();
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-md rounded-3xl" />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
