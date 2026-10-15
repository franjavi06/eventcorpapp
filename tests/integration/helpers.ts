import { prisma } from "@/lib/prisma";

/** Limpia las tablas de negocio respetando el orden de FKs. */
export async function cleanDatabase() {
  await prisma.sorteoGanador.deleteMany();
  await prisma.sorteoEjecucion.deleteMany();
  await prisma.sorteoRegla.deleteMany();
  await prisma.sorteo.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.eventoParticipante.deleteMany();
  await prisma.eventoEmpresa.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.empleado.deleteMany();
  await prisma.empresa.deleteMany();
}
