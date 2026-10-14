"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ href, label, icon: Icon, enabled }) => {
        const active = pathname === href;
        if (!enabled) {
          return (
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
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
