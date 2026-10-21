import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";

export async function getReporteEvento(eventoId: string) {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: {
      empresas: {
        include: {
          empresa: {
            select: { id: true, codigo: true, nombre: true, activo: true },
          },
        },
        orderBy: { empresa: { nombre: "asc" } },
      },
    },
  });
  if (!evento) throw new NotFoundError("Evento no encontrado");

  const [participantes, asistencias, elegibles, sorteos, ganadores] =
    await prisma.$transaction([
      prisma.eventoParticipante.count({ where: { eventoId } }),
      prisma.asistencia.count({
        where: { participante: { eventoId } },
      }),
      prisma.eventoParticipante.count({
        where: {
          eventoId,
          participaSorteos: true,
          empleado: { activo: true, empresa: { activo: true } },
        },
      }),
    prisma.sorteo.findMany({
      where: { eventoId },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: {
        _count: { select: { reglas: true, ejecuciones: true } },
        ejecuciones: {
          where: { estado: "COMPLETADA" },
          select: { id: true, ejecutadoAt: true, ejecutadoPor: true },
          take: 1,
        },
      },
    }),
    prisma.sorteoGanador.findMany({
      where: { eventoId },
      orderBy: { createdAt: "asc" },
      include: {
        participante: {
          include: {
            empleado: {
              select: {
                codigo: true,
                nombres: true,
                apellidos: true,
                puesto: true,
                departamento: true,
                empresa: { select: { nombre: true } },
              },
            },
          },
        },
        ejecucion: { include: { sorteo: { select: { nombre: true } } } },
      },
    }),
  ]);

  const empresas = await Promise.all(
    evento.empresas.map(async ({ empresa }) => {
      const [total, asistidos] = await prisma.$transaction([
        prisma.eventoParticipante.count({
          where: { eventoId, empresaId: empresa.id },
        }),
        prisma.eventoParticipante.count({
          where: {
            eventoId,
            empresaId: empresa.id,
            asistencia: { isNot: null },
          },
        }),
      ]);
      return { ...empresa, participantes: total, asistencias: asistidos };
    }),
  );

  return {
    evento: {
      id: evento.id,
      codigo: evento.codigo,
      nombre: evento.nombre,
      estado: evento.estado,
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin,
      ubicacion: evento.ubicacion,
    },
    totales: {
      empresas: evento.empresas.length,
      participantes,
      asistencias,
      elegibles,
      sorteos: sorteos.length,
      ganadores: ganadores.length,
    },
    empresas,
    sorteos: sorteos.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      estado: s.estado,
      cantidadGanadores: s.cantidadGanadores,
      reglas: s._count.reglas,
      ejecuciones: s._count.ejecuciones,
      ejecutadoAt: s.ejecuciones[0]?.ejecutadoAt ?? null,
      ejecutadoPor: s.ejecuciones[0]?.ejecutadoPor ?? null,
    })),
    ganadores: ganadores.map((g) => ({
      id: g.id,
      empleado: `${g.participante.empleado.nombres} ${g.participante.empleado.apellidos}`,
      codigoEmpleado: g.participante.empleado.codigo,
      puesto: g.participante.empleado.puesto,
      departamento: g.participante.empleado.departamento,
      empresa: g.participante.empleado.empresa.nombre,
      sorteo: g.ejecucion.sorteo.nombre,
      creadoAt: g.createdAt,
    })),
  };
}

export async function getReporteGlobal() {
  const [
    empresas,
    empleados,
    empleadosActivos,
    todosEstados,
    sorteosFinalizados,
    ganadores,
    eventos,
  ] = await prisma.$transaction([
    prisma.empresa.count(),
    prisma.empleado.count(),
    prisma.empleado.count({ where: { activo: true } }),
    prisma.evento.findMany({ select: { estado: true } }),
    prisma.sorteo.count({ where: { estado: "FINALIZADO" } }),
    prisma.sorteoGanador.count(),
    prisma.evento.findMany({
      orderBy: { fechaInicio: "desc" },
      take: 20,
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        fechaInicio: true,
        _count: { select: { empresas: true } },
      },
    }),
  ]);

  const statsPorEvento = await Promise.all(
    eventos.map(async (e) => {
      const [participantes, asistencias] = await prisma.$transaction([
        prisma.eventoParticipante.count({ where: { eventoId: e.id } }),
        prisma.eventoParticipante.count({
          where: { eventoId: e.id, asistencia: { isNot: null } },
        }),
      ]);
      return { eventoId: e.id, participantes, asistencias };
    }),
  );
  const statsMap = new Map(statsPorEvento.map((s) => [s.eventoId, s]));

  const eventosPorEstado: Record<string, number> = {};
  for (const e of todosEstados) {
    eventosPorEstado[e.estado] = (eventosPorEstado[e.estado] ?? 0) + 1;
  }

  return {
    totales: {
      empresas,
      empleados,
      empleadosActivos,
      eventos: todosEstados.length,
      eventosPorEstado,
      sorteosFinalizados,
      ganadores,
    },
    eventos: eventos.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      nombre: e.nombre,
      estado: e.estado,
      fechaInicio: e.fechaInicio,
      empresas: e._count.empresas,
      participantes: statsMap.get(e.id)?.participantes ?? 0,
      asistencias: statsMap.get(e.id)?.asistencias ?? 0,
    })),
  };
}
