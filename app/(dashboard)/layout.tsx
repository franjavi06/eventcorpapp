import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { AppNav } from "@/components/layout/app-nav";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TopHeader } from "@/components/layout/top-header";
import { Badge } from "@/components/ui/badge";

/** Nav estático sin estado activo: shell prerenderizable para Cache Components. */
function StaticNav() {
  return (
    <nav
      className="flex flex-col gap-1.5 px-4"
      aria-label="Navegación principal"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, enabled }) =>
        enabled ? (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ) : (
          <span
            key={href}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground/60"
            aria-disabled="true"
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            <Badge variant="outline" className="text-[10px]">
              Pronto
            </Badge>
          </span>
        ),
      )}
    </nav>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar">
        <div>
          <div className="flex items-center gap-3 border-b border-sidebar-border p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <span className="block text-lg font-bold tracking-tight text-foreground">
                EventCorpApp
              </span>
              <span className="text-xs font-semibold text-indigo-500">
                Plataforma Corporativa
              </span>
            </div>
          </div>
          <div className="py-4">
            <Suspense fallback={<StaticNav />}>
              <AppNav />
            </Suspense>
          </div>
        </div>
        <footer className="space-y-3 border-t border-sidebar-border p-4">
          <ThemeToggle />
          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border p-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-600 text-xs font-bold text-white">
              EC
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                Modo Desarrollo
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Entorno local · sin autenticación
              </p>
            </div>
          </div>
        </footer>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <header className="h-16 shrink-0 border-b bg-card/80 px-8" />
          }
        >
          <TopHeader />
        </Suspense>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
