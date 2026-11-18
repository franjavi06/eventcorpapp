"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchFormProps = {
  /** Ruta a la que envía el GET (ej. "/empresas") */
  action: string;
  defaultValue?: string;
  placeholder?: string;
  /** Inputs ocultos extra que se preservan en la query */
  extraParams?: Record<string, string>;
  children?: React.ReactNode;
};

/**
 * Formulario de búsqueda con navegación SPA y fallback GET nativo.
 * Al buscar se reinicia a página 1 y preserva el modo pantalla completa.
 */
export function SearchForm({
  action,
  defaultValue,
  placeholder = "Buscar…",
  extraParams,
  children,
}: SearchFormProps) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const qs = new URLSearchParams();
    for (const [key, rawValue] of formData.entries()) {
      if (typeof rawValue === "string" && rawValue.trim() !== "") {
        qs.set(key, rawValue.trim());
      }
    }
    qs.delete("page");
    const query = qs.toString();
    router.push(query ? `${action}?${query}` : action);
  }

  return (
    <form
      action={action}
      method="get"
      onSubmit={handleSubmit}
      className="flex items-center gap-2"
    >
      {Object.entries(extraParams ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Input
        key={defaultValue ?? ""}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-64"
        aria-label="Buscar"
      />
      {children}
      <Button type="submit" variant="secondary" size="sm">
        <Search className="size-4" />
        Buscar
      </Button>
    </form>
  );
}
