# EventCorpApp

Plataforma corporativa multi-empresa para la administración de eventos, colaboradores, registro de asistencia (check-in con lector de carnet) y sorteos configurables con motor de reglas y auditoría.

## Características principales

- **Empresas del grupo**: alta, edición, activación/desactivación lógica y logo por empresa (`public/fotos/{CODIGO_EMPRESA}/logo.png` o subida desde el formulario).
- **Empleados**:
  - Gestión individual y **carga masiva desde Excel (`.xlsx`)** con plantilla descargable, importación parcial con reporte de errores por fila y soporte para múltiples formatos de fecha (`YYYY-MM-DD`, `dd/mm/yyyy`, fechas de Excel).
  - Fotos por empresa (`public/fotos/{CODIGO_EMPRESA}/{codigo}.jpg`) con subida en lote desde `/empleados/carga` y tolerancia a diferencias de ceros a la izquierda (ej. `00033` en BD ↔ `0033.jpg`).
- **Eventos y empresas habilitadas**:
  - Creación y gestión de eventos (`BORRADOR`, `ACTIVO`, `FINALIZADO`, `CANCELADO`).
  - Al habilitar una empresa en un evento, todos sus empleados activos quedan inscritos automáticamente como participantes.
- **Participantes y Check-in**:
  - Consola de check-in en modo normal o **pantalla completa**, compatible con lectores de código de barras USB/Bluetooth y ponche manual (`código + Enter`).
  - Filtro opcional por empresa, desempate automático cuando un código repetido entre empresas tiene un único pendiente, y tarjetas de selección visual con foto y logo cuando hay múltiples pendientes.
  - Exclusión de sorteos específica por evento con motivo y responsable, sin afectar la asistencia.
- **Sorteos y Módulo de Ruleta/Premiación**:
  - Configuración por sorteo de cantidad de ganadores, obligatoriedad de asistencia, modo de revelación (`AUTOMATICO` o `MANUAL`) y duración de giro por ganador.
  - Motor de reglas combinadas con `AND` sobre un catálogo seguro de campos de `EMPRESA` y `EMPLEADO`.
  - Vista previa en tiempo real de candidatos elegibles.
  - Pantalla dedicada de **Ruleta y Premiación** (`/eventos/[id]/sorteos/[sorteoId]/ejecutar`) con modo **pantalla completa**, logos de empresas participantes, revelación uno a uno de ganadores (con foto, puesto, departamento y empresa) y garantía en PostgreSQL de **máximo un premio por persona en cada evento**.
- **Reportes y Auditoría**:
  - Dashboard en vivo con KPIs, avance de check-in general y por empresa, sorteos del evento activo, últimos ganadores y recién llegados.
  - Reporte detallado por evento con **exportación a Excel (`.xlsx`)** (hojas *Resumen*, *Ganadores* y *Participantes*).
  - Registro de auditoría de operaciones relevantes con identidad del usuario en sesión.
- **Seguridad, Autenticación y Roles (RBAC)**:
  - Autenticación local en PostgreSQL (`scrypt` + cookie HTTP-only firmada con HMAC-SHA256) y protección global de páginas y API mediante `proxy.ts`.
  - 4 roles operativos: `ADMIN`, `OPERADOR_SORTEOS`, `OPERADOR_CHECKIN` y `CONSULTA`.
  - Módulo `/usuarios` para crear cuentas, asignar roles, restablecer contraseñas y activar/desactivar usuarios.
- **Instructivo integrado**: guía paso a paso disponible dentro de la aplicación en `/ayuda`.

## Stack tecnológico

- **Framework**: Next.js 16.4 (App Router, Turbopack, Cache Components) + React 19
- **Lenguaje**: TypeScript (modo estricto)
- **Base de datos y ORM**: PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)
- **Estilos y UI**: Tailwind CSS 4, componentes Base UI / shadcn, `next-themes` (claro/oscuro) y `lucide-react`
- **Validación y formularios**: Zod 4 + React Hook Form
- **Excel**: ExcelJS (importación de empleados y exportación de reportes)
- **Testing**: Vitest (unitarias e integración) y Playwright (E2E)

## Requisitos previos

- **Node.js** 20+ y **npm** (el proyecto utiliza `package-lock.json`; usar `npm`, no `pnpm`)
- **PostgreSQL** 15+ en ejecución

## Configuración e instalación

1. **Instalar dependencias**:

   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:

   Copia `.env.example` a `.env` y ajusta las cadenas de conexión y secretos:

   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/eventcorp_dev"
   DIRECT_URL="postgresql://usuario:password@localhost:5432/eventcorp_dev"
   TEST_DATABASE_URL="postgresql://usuario:password@localhost:5432/eventcorp_test"

   AUTH_SECRET="cambiar-por-clave-aleatoria-segura-en-produccion"

   ADMIN_INITIAL_USER="admin"
   ADMIN_INITIAL_EMAIL="admin@eventcorp.local"
   ADMIN_INITIAL_PASSWORD="Admin123!"
   ```

3. **Aplicar migraciones y generar el cliente Prisma**:

   ```bash
   npm run db:migrate
   npm run db:generate
   ```

4. **Iniciar el servidor de desarrollo**:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000). Si la tabla `usuarios` está vacía, el sistema crea automáticamente los 4 roles y el usuario administrador inicial definido en `.env`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Genera el build de producción |
| `npm run start` | Inicia el servidor de producción |
| `npm run typecheck` | Verifica tipos con `tsc --noEmit` |
| `npm run lint` | Ejecuta ESLint |
| `npm test` | Ejecuta pruebas unitarias y de integración con Vitest |
| `npm run test:e2e` | Ejecuta pruebas de extremo a extremo con Playwright |
| `npm run db:generate` | Regenera el cliente Prisma en `generated/prisma` |
| `npm run db:migrate` | Crea/aplica migraciones de Prisma en desarrollo |

## Estructura del proyecto

```text
app/
  (dashboard)/          # Páginas protegidas (Dashboard, Empresas, Empleados, Eventos, Reportes, Usuarios, Ayuda)
  login/                # Pantalla de inicio de sesión
  api/                  # Route Handlers REST (auth, empresas, empleados, eventos, sorteos, fotos, reportes, usuarios)
components/
  layout/               # Sidebar, navegación, selector de tema, encabezado y sesión de usuario
  shared/               # Avatares de empleado, logos de empresa, paginación, filtros, estados vacíos
  ui/                   # Componentes base de interfaz
modules/
  auth/                 # Hash de contraseñas, sesión firmada, RBAC y gestión de usuarios
  empresas/             # Esquemas, repositorio, servicio y componentes de empresas
  empleados/            # CRUD de empleados, carga masiva Excel y gestión de fotos/logos por carpeta
  eventos/              # Eventos y asociación de empresas con auto-inscripción de empleados activos
  participantes/        # Participantes, consola de check-in por carnet y exclusiones
  sorteos/              # Sorteos, catálogo y motor de reglas, elegibilidad y tómbola/ruleta
  reportes/             # Métricas globales y por evento
  auditoria/            # Registro y consulta de auditoría
  ayuda/                # Instructivo paso a paso (/ayuda)
prisma/
  schema.prisma         # Esquema de base de datos y migraciones
tests/
  unit/                 # Pruebas unitarias
  integration/          # Pruebas de integración contra PostgreSQL (eventcorp_test)
  e2e/                  # Pruebas Playwright
proxy.ts                # Protección de rutas y API en servidor
```
