import Link from "next/link";
import { Suspense } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Badge } from "@/components/ui/badge";

/** Nav estático sin estado activo: shell prerenderizable para Cache Components. */
function StaticNav() {
  return (
    <nav
      className="flex flex-col gap-1 px-3"
      aria-label="Navegación principal"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, enabled }) =>
        enabled ? (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60"
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ) : (
          <span
            key={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
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
      <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <span className="text-base font-semibold tracking-tight">
            EventCorpApp
          </span>
        </div>
        <div className="flex-1 py-4">
          <Suspense fallback={<StaticNav />}>
            <AppNav />
          </Suspense>
        </div>
        <footer className="border-t px-5 py-3 text-xs text-muted-foreground">
          Entorno local · sin autenticación
        </footer>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
