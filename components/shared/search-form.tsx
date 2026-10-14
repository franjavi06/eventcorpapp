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
 * Formulario de búsqueda por GET nativo (sin JS de cliente).
 * Al buscar se reinicia a página 1.
 */
export function SearchForm({
  action,
  defaultValue,
  placeholder = "Buscar…",
  extraParams,
  children,
}: SearchFormProps) {
  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {Object.entries(extraParams ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Input
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
