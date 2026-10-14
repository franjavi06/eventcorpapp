import Link from "next/link";

import { cn } from "@/lib/utils";

type FilterTabsProps = {
  basePath: string;
  /** Nombre del query param (ej. "estado") */
  paramName: string;
  options: readonly { value: string; label: string }[];
  current: string;
  /** Parámetros actuales a preservar (q, page se descarta) */
  params?: Record<string, string | undefined>;
};

export function FilterTabs({
  basePath,
  paramName,
  options,
  current,
  params = {},
}: FilterTabsProps) {
  return (
    <div className="flex gap-1 rounded-md border p-1">
      {options.map(({ value, label }) => {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== "") qs.set(k, v);
        }
        qs.set(paramName, value);
        qs.delete("page");
        const s = qs.toString();
        return (
          <Link
            key={value}
            href={s ? `${basePath}?${s}` : basePath}
            className={cn(
              "rounded-sm px-3 py-1 text-sm transition-colors",
              current === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
