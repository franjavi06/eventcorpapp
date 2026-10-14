import Link from "next/link";

import { cn } from "@/lib/utils";

type EstadoFilterProps = {
  basePath: string;
  activo: "true" | "false" | "all";
  params?: Record<string, string | undefined>;
};

const OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
] as const;

export function EstadoFilter({
  basePath,
  activo,
  params = {},
}: EstadoFilterProps) {
  return (
    <div className="flex gap-1 rounded-md border p-1">
      {OPTIONS.map(({ value, label }) => {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== "") qs.set(k, v);
        }
        qs.set("activo", value);
        qs.delete("page");
        const s = qs.toString();
        return (
          <Link
            key={value}
            href={s ? `${basePath}?${s}` : basePath}
            className={cn(
              "rounded-sm px-3 py-1 text-sm transition-colors",
              activo === value
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
