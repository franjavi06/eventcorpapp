"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1.5 px-4" aria-label="Navegación principal">
      {NAV_ITEMS.map(({ href, label, icon: Icon, enabled }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        if (!enabled) {
          return (
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
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
              active
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
