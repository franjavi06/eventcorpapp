"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between rounded-xl border border-sidebar-border p-2">
      <span className="px-2 text-xs font-semibold text-muted-foreground">
        Tema Visual
      </span>
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
        title="Cambiar Modo Claro/Oscuro"
      >
        <Sun className="hidden size-3.5 dark:block" />
        <Moon className="block size-3.5 dark:hidden" />
        <span className="hidden dark:inline">Modo Claro</span>
        <span className="inline dark:hidden">Modo Oscuro</span>
      </button>
    </div>
  );
}
