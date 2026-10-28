"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

import { cn } from "@/lib/utils";

type EmpresaLogoProps = {
  empresaCodigo?: string | null;
  nombre: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASSES: Record<
  NonNullable<EmpresaLogoProps["size"]>,
  { box: string; icon: string }
> = {
  xs: { box: "size-6 rounded-md p-0.5", icon: "size-4" },
  sm: { box: "size-9 rounded-lg p-1", icon: "size-5" },
  md: { box: "size-14 rounded-2xl p-1.5", icon: "size-6" },
  lg: { box: "size-16 rounded-2xl p-2", icon: "size-7" },
  xl: { box: "size-20 rounded-2xl p-2", icon: "size-8" },
};

export function EmpresaLogo({
  empresaCodigo,
  nombre,
  size = "md",
  className,
}: EmpresaLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = empresaCodigo
    ? `/api/empresas/logo/${encodeURIComponent(empresaCodigo)}`
    : null;
  const showImg = Boolean(src && failedSrc !== src);
  const styles = SIZE_CLASSES[size];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
        styles.box,
        showImg && "bg-white dark:bg-white/95",
        className,
      )}
    >
      {showImg && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={nombre}
          className="size-full object-contain"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Building2 className={styles.icon} />
      )}
    </span>
  );
}
