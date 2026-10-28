import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { isRecordNotFound, isUniqueViolation } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/modules/auditoria/lib/audit";
import { hashPassword, verifyPassword } from "@/modules/auth/lib/password";
import { getSessionFromCookies } from "@/modules/auth/lib/session";
import {
  loginSchema,
  PERMISOS_CODIGOS,
  type PermisoCodigo,
  type RolCodigo,
  usuarioCreateSchema,
  usuarioUpdateSchema,
} from "@/modules/auth/schemas/usuario.schema";

export const CATALOGO_PERMISOS: {
  codigo: PermisoCodigo;
  modulo: string;
  descripcion: string;
}[] = [
  {
    codigo: "EMPRESAS_WRITE",
    modulo: "Empresas",
    descripcion: "Crear, editar y activar/desactivar empresas",
  },
  {
    codigo: "EMPLEADOS_WRITE",
    modulo: "Empleados",
    descripcion: "Crear, editar e importar empleados y fotos",
  },
  {
    codigo: "EVENTOS_WRITE",
    modulo: "Eventos",
    descripcion: "Crear, editar eventos y asociar empresas",
  },
  {
    codigo: "PARTICIPANTES_WRITE",
    modulo: "Participantes",
    descripcion: "Añadir/quitar participantes y excluir de sorteos",
  },
  {
    codigo: "CHECKIN_WRITE",
    modulo: "Check-in",
    descripcion: "Registrar y anular asistencias (check-in)",
  },
  {
    codigo: "SORTEOS_WRITE",
    modulo: "Sorteos",
    descripcion: "Crear, editar sorteos y configurar reglas",
  },
  {
    codigo: "SORTEOS_EJECUTAR",
    modulo: "Sorteos",
    descripcion: "Ejecutar la ruleta de sorteos y adjudicar ganadores",
  },
  {
    codigo: "USUARIOS_MANAGE",
    modulo: "Seguridad",
    descripcion: "Administrar usuarios, roles y contraseñas",
  },
  {
    codigo: "REPORTES_READ",
    modulo: "Reportes",
    descripcion: "Consultar dashboard, reportes y exportar Excel",
  },
];

export const CATALOGO_ROLES: {
  codigo: RolCodigo;
  nombre: string;
  descripcion: string;
  permisos: PermisoCodigo[];
}[] = [
  {
    codigo: "ADMIN",
    nombre: "Administrador",
    descripcion: "Acceso total a empresas, empleados, eventos, sorteos y usuarios",
    permisos: [...PERMISOS_CODIGOS],
  },
  {
    codigo: "OPERADOR_SORTEOS",
    nombre: "Operador de Sorteos",
    descripcion: "Gestiona eventos, participantes, sorteos y ejecuta la ruleta",
    permisos: [
      "EVENTOS_WRITE",
      "PARTICIPANTES_WRITE",
      "SORTEOS_WRITE",
      "SORTEOS_EJECUTAR",
      "REPORTES_READ",
    ],
  },
  {
    codigo: "OPERADOR_CHECKIN",
    nombre: "Operador de Check-in",
    descripcion: "Registra asistencias con carnet e incorpora participantes",
    permisos: ["CHECKIN_WRITE", "PARTICIPANTES_WRITE", "REPORTES_READ"],
  },
  {
    codigo: "CONSULTA",
    nombre: "Consulta y Reportes",
    descripcion: "Visualización de dashboard, eventos, sorteos y reportes",
    permisos: ["REPORTES_READ"],
  },
];

export function getInitialAdminCredentials() {
  return {
    username: (process.env.ADMIN_INITIAL_USER ?? "admin").trim().toLowerCase(),
    correo: (
      process.env.ADMIN_INITIAL_EMAIL ?? "admin@eventcorp.local"
    )
      .trim()
      .toLowerCase(),
    password: process.env.ADMIN_INITIAL_PASSWORD ?? "Admin123!",
    nombre: "Administrador Principal",
  };
}

/**
 * Garantiza que existan los 4 roles, sus permisos y —si la tabla `usuarios`
 * está vacía— un usuario administrador inicial.
 */
export async function ensureInitialAuthSeed() {
  for (const p of CATALOGO_PERMISOS) {
    await prisma.permiso.upsert({
      where: { codigo: p.codigo },
      create: p,
      update: { modulo: p.modulo, descripcion: p.descripcion },
    });
  }

  const permisosDb = await prisma.permiso.findMany();
  const permisoIdByCodigo = new Map(permisosDb.map((p) => [p.codigo, p.id]));

  for (const r of CATALOGO_ROLES) {
    const rol = await prisma.rol.upsert({
      where: { codigo: r.codigo },
      create: {
        codigo: r.codigo,
        nombre: r.nombre,
        descripcion: r.descripcion,
      },
      update: {
        nombre: r.nombre,
        descripcion: r.descripcion,
      },
    });

    await prisma.rolPermiso.createMany({
      data: r.permisos
        .map((c) => permisoIdByCodigo.get(c))
        .filter((id): id is string => Boolean(id))
        .map((permisoId) => ({ rolId: rol.id, permisoId })),
      skipDuplicates: true,
    });
  }

  const totalUsuarios = await prisma.usuario.count();
  if (totalUsuarios === 0) {
    const adminRol = await prisma.rol.findUnique({ where: { codigo: "ADMIN" } });
    const creds = getInitialAdminCredentials();
    const passwordHash = await hashPassword(creds.password);
    try {
      await prisma.usuario.create({
        data: {
          username: creds.username,
          correo: creds.correo,
          nombre: creds.nombre,
          passwordHash,
          activo: true,
          ...(adminRol && {
            roles: { create: [{ rolId: adminRol.id }] },
          }),
        },
      });
    } catch {
      // carrera concurrente benigna
    }
  }
}

const usuarioInclude = {
  roles: {
    include: {
      rol: {
        include: {
          permisos: { include: { permiso: true } },
        },
      },
    },
  },
};

export type UsuarioAutenticado = {
  id: string;
  username: string;
  correo: string;
  nombre: string;
  activo: boolean;
  roles: RolCodigo[];
  permisos: PermisoCodigo[];
};

function mapUsuario(u: {
  id: string;
  username: string;
  correo: string;
  nombre: string;
  activo: boolean;
  roles: {
    rol: {
      codigo: string;
      permisos: { permiso: { codigo: string } }[];
    };
  }[];
}): UsuarioAutenticado {
  const roles = u.roles.map((ur) => ur.rol.codigo as RolCodigo);
  const permisosSet = new Set<PermisoCodigo>();
  for (const ur of u.roles) {
    for (const rp of ur.rol.permisos) {
      permisosSet.add(rp.permiso.codigo as PermisoCodigo);
    }
  }
  return {
    id: u.id,
    username: u.username,
    correo: u.correo,
    nombre: u.nombre,
    activo: u.activo,
    roles,
    permisos: Array.from(permisosSet),
  };
}

export async function loginUsuario(input: unknown): Promise<UsuarioAutenticado> {
  const { identificador, password } = loginSchema.parse(input);
  await ensureInitialAuthSeed();

  const normalized = identificador.trim().toLowerCase();
  const user = await prisma.usuario.findFirst({
    where: {
      OR: [{ username: normalized }, { correo: normalized }],
    },
    include: usuarioInclude,
  });

  if (!user) {
    throw new UnauthorizedError("Usuario o contraseña incorrectos");
  }
  if (!user.activo) {
    throw new ForbiddenError("La cuenta de usuario está desactivada");
  }

  const okPassword = await verifyPassword(password, user.passwordHash);
  if (!okPassword) {
    throw new UnauthorizedError("Usuario o contraseña incorrectos");
  }

  const mapped = mapUsuario(user);
  await registrarAuditoria({
    entidad: "Usuario",
    entidadId: user.id,
    accion: "LOGIN",
    actor: user.username,
    despues: { username: user.username, roles: mapped.roles },
  });
  return mapped;
}

export async function getCurrentUser(): Promise<UsuarioAutenticado | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const user = await prisma.usuario.findUnique({
    where: { id: session.sub },
    include: usuarioInclude,
  });
  if (!user || !user.activo) return null;
  return mapUsuario(user);
}

/**
 * Verifica que el usuario tenga el permiso requerido en el servidor.
 * Exige por defecto (`strict = true`) sesión activa y que el rol del usuario
 * incluya el permiso solicitado.
 */
export async function requirePermission(
  permiso: PermisoCodigo,
  options: { strict?: boolean } = {},
): Promise<UsuarioAutenticado | null> {
  const strict = options.strict ?? true;
  const user = await getCurrentUser();
  if (!user) {
    if (strict) {
      throw new UnauthorizedError("Debe iniciar sesión para continuar");
    }
    return null;
  }
  if (!user.permisos.includes(permiso)) {
    throw new ForbiddenError(
      `Su rol (${user.roles.join(", ") || "sin rol"}) no tiene el permiso ${permiso}`,
    );
  }
  return user;
}

export async function listUsuarios() {
  await ensureInitialAuthSeed();
  const rows = await prisma.usuario.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: usuarioInclude,
  });
  return rows.map((u) => ({
    ...mapUsuario(u),
    createdAt: u.createdAt,
  }));
}

export async function createUsuario(input: unknown, actor?: string | null) {
  const data = usuarioCreateSchema.parse(input);
  await ensureInitialAuthSeed();

  const rolesDb = await prisma.rol.findMany({
    where: { codigo: { in: data.roles } },
  });
  if (rolesDb.length === 0) {
    throw new ValidationError("Los roles seleccionados no existen");
  }

  const passwordHash = await hashPassword(data.password);
  try {
    const creado = await prisma.usuario.create({
      data: {
        username: data.username,
        correo: data.correo,
        nombre: data.nombre,
        passwordHash,
        roles: {
          create: rolesDb.map((r) => ({ rolId: r.id })),
        },
      },
      include: usuarioInclude,
    });
    const mapped = mapUsuario(creado);
    await registrarAuditoria({
      entidad: "Usuario",
      entidadId: creado.id,
      accion: "CREAR_USUARIO",
      actor,
      despues: {
        username: creado.username,
        correo: creado.correo,
        nombre: creado.nombre,
        roles: mapped.roles,
      },
    });
    return mapped;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Ya existe un usuario con ese username o correo");
    }
    throw error;
  }
}

export async function updateUsuario(
  id: string,
  input: unknown,
  currentUserId?: string | null,
  actor?: string | null,
) {
  const data = usuarioUpdateSchema.parse(input);
  if (data.activo === false && currentUserId && currentUserId === id) {
    throw new ValidationError("No puede desactivar su propia cuenta en sesión");
  }

  const existente = await prisma.usuario.findUnique({
    where: { id },
    include: usuarioInclude,
  });
  if (!existente) {
    throw new NotFoundError("Usuario no encontrado");
  }

  const passwordHash = data.password
    ? await hashPassword(data.password)
    : undefined;

  let rolesIds: string[] | undefined;
  if (data.roles) {
    const rolesDb = await prisma.rol.findMany({
      where: { codigo: { in: data.roles } },
    });
    rolesIds = rolesDb.map((r) => r.id);
  }

  try {
    const actualizado = await prisma.$transaction(async (tx) => {
      if (rolesIds) {
        await tx.usuarioRol.deleteMany({ where: { usuarioId: id } });
        await tx.usuarioRol.createMany({
          data: rolesIds.map((rolId) => ({ usuarioId: id, rolId })),
        });
      }
      return tx.usuario.update({
        where: { id },
        data: {
          ...(data.nombre !== undefined && { nombre: data.nombre }),
          ...(data.correo !== undefined && { correo: data.correo }),
          ...(data.activo !== undefined && { activo: data.activo }),
          ...(passwordHash !== undefined && { passwordHash }),
        },
        include: usuarioInclude,
      });
    });

    const mapped = mapUsuario(actualizado);
    await registrarAuditoria({
      entidad: "Usuario",
      entidadId: id,
      accion: "ACTUALIZAR_USUARIO",
      actor,
      antes: {
        nombre: existente.nombre,
        correo: existente.correo,
        activo: existente.activo,
        roles: mapUsuario(existente).roles,
      },
      despues: {
        nombre: actualizado.nombre,
        correo: actualizado.correo,
        activo: actualizado.activo,
        roles: mapped.roles,
        passwordCambiado: Boolean(passwordHash),
      },
    });
    return mapped;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("Ya existe otro usuario con ese correo");
    }
    if (isRecordNotFound(error)) {
      throw new NotFoundError("Usuario no encontrado");
    }
    throw error;
  }
}
