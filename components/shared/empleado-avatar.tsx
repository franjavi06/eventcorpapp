"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type EmpleadoAvatarProps = {
  empresaCodigo?: string | null;
  empleadoCodigo: string;
  nombre: string;
  size?: "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<EmpleadoAvatarProps["size"]>, string> = {
  md: "size-12 rounded-xl text-sm",
  lg: "size-16 rounded-2xl text-lg",
  xl: "size-28 rounded-3xl text-2xl md:size-32",
};

function getInitials(nombre: string): string {
  const parts = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function EmpleadoAvatar({
  empresaCodigo,
  empleadoCodigo,
  nombre,
  size = "md",
  className,
}: EmpleadoAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src =
    empresaCodigo && empleadoCodigo
      ? `/api/fotos/${encodeURIComponent(empresaCodigo)}/${encodeURIComponent(empleadoCodigo)}`
      : null;

  const showImg = Boolean(src && failedSrc !== src);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border bg-indigo-500/10 font-bold text-indigo-500",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImg && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={nombre}
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden>{getInitials(nombre)}</span>
      )}
    </div>
  );
}
