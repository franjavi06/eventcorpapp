import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditEntry = {
  /** Evento relacionado, cuando aplica (para filtrar el historial). */
  eventoId?: string | null;
  /** Nombre de la entidad afectada: "Evento", "EventoParticipante", "Sorteo"… */
  entidad: string;
  /** Identificador de la entidad (uuid o clave compuesta legible). */
  entidadId?: string | null;
  /** Acción realizada: "CREAR", "ACTUALIZAR", "CHECK_IN", "EXCLUIR_SORTEOS"… */
  accion: string;
  /** Quién realizó la operación; texto libre hasta que exista autenticación. */
  actor?: string | null;
  /** Estado anterior (serializable a JSON). */
  antes?: Prisma.InputJsonValue | null;
  /** Estado posterior (serializable a JSON). */
  despues?: Prisma.InputJsonValue | null;
};

type Cliente = Prisma.TransactionClient | typeof prisma;

/**
 * Registra una operación en la tabla de auditoría. Si recibe un `tx`,
 * escribe dentro de esa transacción (check-in, ejecución de sorteos).
 * Nunca debe romper la operación principal: los errores se registran
 * en consola salvo dentro de una transacción, donde se propagan para
 * mantener la atomicidad.
 */
export async function registrarAuditoria(entry: AuditEntry, tx?: Cliente) {
  const client = tx ?? prisma;
  const data = {
    eventoId: entry.eventoId ?? null,
    entidad: entry.entidad,
    entidadId: entry.entidadId ?? null,
    accion: entry.accion,
    actor: entry.actor ?? null,
    antes: entry.antes ?? Prisma.JsonNull,
    despues: entry.despues ?? Prisma.JsonNull,
  };
  try {
    await client.auditoria.create({ data });
  } catch (error) {
    if (tx) throw error;
    console.error("[auditoria] no se pudo registrar:", error);
  }
}
