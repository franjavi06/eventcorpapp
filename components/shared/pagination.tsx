import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  /** Ruta base (ej. "/empresas") */
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  /** Parámetros actuales que deben preservarse (q, activo, empresaId…) */
  params?: Record<string, string | undefined>;
};

function href(basePath: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

function PageLink({
  disabled,
  href: to,
  children,
}: {
  disabled: boolean;
  href: string;
  children: React.ReactNode;
}) {
  const className = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    disabled && "pointer-events-none opacity-50",
  );
  if (disabled) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={to} className={className}>
      {children}
    </Link>
  );
}

export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  params = {},
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {total} resultado{total === 1 ? "" : "s"}
        {totalPages > 1 && (
          <>
            {" "}
            · página {page} de {totalPages}
          </>
        )}
      </p>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <PageLink
            disabled={page <= 1}
            href={href(basePath, { ...params, page: String(page - 1) })}
          >
            Anterior
          </PageLink>
          <PageLink
            disabled={page >= totalPages}
            href={href(basePath, { ...params, page: String(page + 1) })}
          >
            Siguiente
          </PageLink>
        </div>
      )}
    </div>
  );
}
