import { prisma } from "@/lib/prisma";

/** Limpia las tablas de negocio respetando el orden de FKs. */
export async function cleanDatabase() {
  await prisma.auditoria.deleteMany();
  await prisma.usuarioRol.deleteMany();
  await prisma.rolPermiso.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.rol.deleteMany();
  await prisma.permiso.deleteMany();
  await prisma.sorteoGanador.deleteMany();
  await prisma.sorteoEjecucion.deleteMany();
  await prisma.sorteoCuota.deleteMany();
  await prisma.sorteoRegla.deleteMany();
  await prisma.sorteo.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.eventoParticipante.deleteMany();
  await prisma.eventoEmpresa.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.empleado.deleteMany();
  await prisma.empresa.deleteMany();
}
