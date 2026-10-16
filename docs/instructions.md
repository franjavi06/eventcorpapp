# Proyecto: EventCorpApp — Plataforma corporativa de eventos y sorteos

## 1. Tu rol

Actúa como un ingeniero de software senior especializado en Next.js, TypeScript, PostgreSQL, Prisma ORM y diseño de aplicaciones empresariales.

Tu responsabilidad es desarrollar EventCorpApp por etapas, con una arquitectura mantenible, código tipado, validaciones consistentes y pruebas automatizadas.

**No intentes implementar todo el sistema de una sola vez.** Trabaja exclusivamente en la etapa solicitada, valida lo desarrollado y espera autorización antes de avanzar a la siguiente.

## 2. Objetivo del proyecto

Construir una aplicación web interna para administrar eventos corporativos, empleados de múltiples empresas, registro de asistencia y sorteos configurables.

La plataforma permitirá organizar eventos compartidos entre varias empresas del mismo grupo empresarial. Cada evento podrá tener múltiples sorteos, cada uno con sus propias reglas de elegibilidad y cantidad de ganadores.

El sistema reemplazará una aplicación anterior. El desarrollo se realizará desde cero, sin migrar sus datos ni conservar su esquema como diseño obligatorio. Si se proporciona un respaldo de la aplicación anterior, úsalo únicamente para comprender el funcionamiento del negocio.

## 3. Stack tecnológico obligatorio

- Next.js con App Router.
- TypeScript en modo estricto.
- PostgreSQL como base de datos.
- Prisma ORM para el acceso a datos y las migraciones.
- Tailwind CSS para estilos.
- shadcn/ui para componentes visuales cuando resulte conveniente.
- Zod para validación de datos.
- React Hook Form para formularios complejos cuando sea necesario.
- Vitest para pruebas unitarias y de integración compatibles con el entorno.
- Playwright para pruebas de los flujos principales de usuario.

Utiliza versiones estables y compatibles de las dependencias disponibles en el entorno. No actualices dependencias principales sin necesidad ni mezcles instrucciones de versiones incompatibles de Prisma.

La aplicación se desarrollará inicialmente como un **monolito modular en Next.js**. No crear una API independiente en NestJS ni microservicios en esta primera versión.

## 4. Alcance funcional

### Empresas

- Crear, consultar, editar y desactivar empresas.
- Identificar cada empresa mediante un código único.
- Mantener clasificación, ubicación y estado activo.
- Una empresa puede tener muchos empleados.
- Una empresa puede participar en múltiples eventos.

### Empleados

- Crear, consultar, editar y desactivar empleados.
- Cada empleado pertenece a exactamente una empresa.
- Registrar código, identificación cuando corresponda, nombres, apellidos, correo, departamento, puesto, clase de nómina, fecha de ingreso y estado activo.
- Evitar duplicados según las restricciones definidas en el modelo.
- Los campos de empresa y empleado podrán utilizarse como criterios de selección para los sorteos.

**Importante:** no colocar un indicador global `participaSorteos` en el modelo Empleado. La elegibilidad se administra por evento.

### Eventos

- Crear y editar eventos corporativos.
- Registrar nombre, código, descripción, ubicación, fecha de inicio, fecha de finalización y estado.
- Asociar una o varias empresas a un evento.
- Permitir consultar las empresas habilitadas para cada evento.
- Impedir inconsistencias de fechas y asociaciones inválidas.
- No implementar invitaciones ni confirmaciones de asistencia.

### Participantes y asistencia

- Incorporar empleados a un evento.
- Registrar la asistencia de cada empleado.
- Evitar registros duplicados de un mismo empleado dentro del mismo evento.
- Un empleado debe pertenecer a una empresa habilitada para el evento.
- La asistencia no depende de la elegibilidad para los sorteos.
- Un empleado excluido de los sorteos puede asistir normalmente.

El modelo EventoParticipante representa la relación entre un empleado y un evento. Asistencia representa el registro efectivo del check-in.

Si el proceso operativo incorpora a los participantes durante el check-in, crear o recuperar EventoParticipante y registrar Asistencia dentro de una transacción. No introducir estados de invitación o confirmación.

### Elegibilidad para sorteos

El modelo EventoParticipante debe contener el indicador `participaSorteos`, con valor inicial verdadero.

La exclusión:

- Es específica de un evento.
- No modifica el registro general del empleado.
- No afecta la asistencia.
- Debe permitir registrar motivo, fecha y usuario responsable.
- Debe conservar trazabilidad de los cambios.
- No debe confundirse con las reglas configurables de cada sorteo.

La elegibilidad efectiva para un sorteo debe considerar, como mínimo:

1. El empleado está activo.
2. La empresa está activa y habilitada para el evento.
3. El empleado pertenece a una empresa habilitada para ese evento.
4. El participante tiene `participaSorteos = true`.
5. Si el sorteo requiere asistencia, existe un registro de asistencia.
6. Cumple todas las reglas configuradas para el sorteo.
7. No ha ganado previamente otro sorteo del mismo evento.

No confíes únicamente en filtros de interfaz. La elegibilidad debe verificarse en el servicio de negocio en el momento de ejecutar el sorteo.

### Sorteos

- Cada evento puede tener múltiples sorteos.
- Cada sorteo tiene nombre, descripción, cantidad de ganadores, orden, estado y configuración de asistencia obligatoria.
- La asistencia es obligatoria por defecto.
- Cada sorteo tiene reglas de elegibilidad configurables.
- La cantidad de ganadores debe ser un entero positivo.
- Debe validarse que existan suficientes candidatos antes de ejecutar el sorteo.
- No permitir modificar silenciosamente resultados de ejecuciones completadas.

### Motor de reglas

La primera versión soportará exclusivamente condiciones simples combinadas con AND.

Ejemplo:

- Empresa.clasificacion es igual a "GRUPO".
- Empleado.departamento es igual a "VENTAS".
- Empleado.activo es igual a verdadero.

Un candidato debe cumplir todas las reglas activas.

Cada regla deberá definir:

- Entidad: EMPRESA o EMPLEADO.
- Campo permitido.
- Tipo de dato.
- Operador.
- Valor.
- Orden.
- Estado activo.

Utiliza un catálogo de campos permitidos en el servidor. Define los operadores válidos según el tipo de dato. Valida valores con Zod y utiliza consultas parametrizadas.

Nunca ejecutes SQL arbitrario recibido desde el navegador ni permitas que el cliente determine libremente nombres de tablas o columnas.

### Ejecución de sorteos

La ejecución debe:

1. Iniciar una transacción de base de datos.
2. Serializar las ejecuciones que puedan competir por ganadores del mismo evento.
3. Obtener candidatos elegibles.
4. Excluir a quienes ya hayan ganado en ese evento.
5. Comprobar que haya suficientes candidatos.
6. Seleccionar aleatoriamente la cantidad solicitada.
7. Registrar la ejecución, las reglas aplicadas y los resultados.
8. Confirmar la transacción.

Si ocurre un error, no dejar resultados parciales.

La regla fundamental es:

**Una persona puede ganar como máximo una vez dentro de un mismo evento, independientemente de cuántos sorteos existan.**

Esta restricción debe estar protegida por PostgreSQL, además de los controles de la aplicación. Una consulta previa que excluya ganadores no es suficiente ante ejecuciones concurrentes.

Si no hay suficientes candidatos, cancelar la ejecución sin adjudicar ganadores parciales.

Las ejecuciones completadas deben conservar sus resultados. Una repetición autorizada debe quedar registrada como una nueva ejecución, no sobrescribir silenciosamente la anterior.

### Auditoría

Registrar las operaciones relevantes:

- Creación y modificación de eventos.
- Asociación de empresas a eventos.
- Cambios en participantes y elegibilidad.
- Registro de asistencia.
- Cambios en reglas y configuración de sorteos.
- Ejecuciones, fallos y resultados de sorteos.

La auditoría debe conservar quién realizó la operación cuando esa información esté disponible, qué entidad cambió, cuándo ocurrió y los valores anteriores y nuevos cuando corresponda.

## 5. Modelo de datos inicial

Utiliza como punto de partida estos modelos conceptuales:

- Empresa
- Empleado
- Evento
- EventoEmpresa
- EventoParticipante
- Asistencia
- Sorteo
- SorteoRegla
- SorteoEjecucion
- SorteoGanador
- Usuario
- Rol
- Permiso
- UsuarioRol
- RolPermiso
- Auditoria

No crees todos los modelos desde el primer día si no son necesarios para la etapa actual. Implementa únicamente los que requiera cada etapa, manteniendo una dirección arquitectónica coherente.

Utiliza UUID como identificadores principales, restricciones únicas, claves foráneas e índices donde correspondan.

En particular:

- Un empleado pertenece a una sola empresa.
- Un evento puede asociarse con varias empresas.
- Un empleado puede participar en varios eventos.
- Solo puede existir un EventoParticipante por combinación de evento y empleado.
- Un participante tiene como máximo un registro de asistencia.
- Una persona solo puede ser ganadora una vez por evento.
- Las adjudicaciones deben estar asociadas a una ejecución y a un participante del mismo evento.

Utiliza claves foráneas compuestas donde sean necesarias para garantizar la coherencia entre evento, empresa, participante y ejecución.

## 6. Arquitectura del código

Organiza el proyecto por funcionalidades, evitando concentrar toda la lógica en componentes React.

Estructura de referencia:

src/
  app/
    (dashboard)/
      empresas/
      empleados/
      eventos/
      sorteos/
      reportes/
    api/
  components/
    ui/
    layout/
    shared/
  modules/
    empresas/
      schemas/
      services/
      repositories/
      components/
    empleados/
      schemas/
      services/
      repositories/
      components/
    eventos/
      schemas/
      services/
      repositories/
      components/
    participantes/
      schemas/
      services/
      repositories/
      components/
    sorteos/
      schemas/
      services/
      repositories/
      components/
    auditoria/
  lib/
    prisma.ts
    validations/
    utils/

prisma/
  schema.prisma
  migrations/

tests/

Adapta la estructura a las convenciones de Next.js y evita crear carpetas vacías o abstracciones innecesarias.

Responsabilidades:

- Los componentes presentan información y gestionan interacciones.
- Los esquemas Zod validan las entradas.
- Los servicios implementan las reglas de negocio.
- Los repositorios encapsulan consultas complejas cuando aporten valor.
- Prisma gestiona el acceso a PostgreSQL.
- Las Server Actions o Route Handlers validan y delegan en los servicios.
- Las transacciones agrupan operaciones que deben confirmarse o revertirse conjuntamente.

No dupliques la misma regla de negocio en componentes, Server Actions y servicios.

## 7. Autenticación y seguridad: posponer hasta el final

Durante las primeras etapas, no implementar todavía:

- Inicio de sesión.
- Registro de usuarios.
- Recuperación de contraseñas.
- Integración con Active Directory o SSO.
- Roles y permisos funcionales completos.
- Pantallas de administración de usuarios.
- Flujos de autorización por usuario.

Estos elementos se implementarán en una etapa final específica.

Sin embargo, posponer la autenticación no significa desarrollar código inseguro. Desde el comienzo:

- Valida las entradas en el servidor.
- Evita SQL injection y XSS.
- No expongas secretos en el cliente.
- Mantén las credenciales fuera del repositorio.
- Evita endpoints de administración públicos.
- No habilites operaciones destructivas indiscriminadamente.
- No uses datos personales reales en pruebas.
- Separa los servicios de negocio de la interfaz para poder integrar posteriormente autenticación y autorización.

Durante el desarrollo local se puede utilizar un entorno controlado sin login, con datos ficticios. Antes de cualquier despliegue accesible por usuarios, implementa y verifica la autenticación y autorización necesarias.

## 8. Desarrollo por etapas

Sigue este orden. No avances de etapa sin mi autorización.

### Etapa 0 — Inspección y planificación

- Inspecciona el repositorio actual.
- Identifica el estado de Next.js, TypeScript, Prisma y PostgreSQL.
- Si el repositorio está vacío, crea la estructura mínima necesaria.
- Define las decisiones técnicas y las dependencias.
- Propón un plan de implementación concreto.
- No implementes todavía toda la aplicación.

### Etapa 1 — Fundación del proyecto

- Configura Next.js y TypeScript.
- Configura Tailwind CSS y los componentes UI.
- Configura Prisma y PostgreSQL.
- Crea la conexión reutilizable de Prisma.
- Configura variables de entorno y `.env.example`.
- Configura validación básica y manejo uniforme de errores.
- Prepara las pruebas automatizadas.
- Implementa un layout inicial del dashboard con navegación provisional.
- Verifica que la aplicación arranca y que Prisma se conecta correctamente.

No implementar autenticación.

### Etapa 2 — Empresas y empleados

- Diseña e implementa Empresa y Empleado.
- Crea sus migraciones.
- Implementa CRUD con validación en servidor.
- Crea formularios, tablas, búsqueda, filtros y paginación cuando corresponda.
- Implementa desactivación lógica en lugar de eliminar registros relacionados.
- Prueba las restricciones y relaciones.

No desarrollar todavía el motor de sorteos.

### Etapa 3 — Eventos y empresas participantes

- Implementa Evento y EventoEmpresa.
- Permite asociar varias empresas a un evento.
- Valida las fechas y el estado.
- Implementa el CRUD y las pantallas necesarias.
- Evita asociaciones duplicadas y empresas desactivadas.

### Etapa 4 — Participantes y asistencia

- Implementa EventoParticipante y Asistencia.
- Permite incorporar empleados de empresas habilitadas.
- Implementa el check-in.
- Implementa la exclusión de sorteos por evento.
- Permite registrar el motivo de exclusión.
- Conserva la asistencia aunque el participante esté excluido de sorteos.
- Registra los cambios relevantes en auditoría.

### Etapa 5 — Configuración de sorteos y motor de reglas

- Implementa Sorteo y SorteoRegla.
- Construye un catálogo seguro de campos y operadores permitidos.
- Implementa formularios para construir condiciones AND sin escribir código.
- Valida los tipos de datos y los valores.
- Implementa un servicio que determine la elegibilidad efectiva.
- Crea pruebas para combinaciones de reglas, asistencia y exclusiones.

### Etapa 6 — Ejecución de sorteos y ganadores

- Implementa SorteoEjecucion y SorteoGanador.
- Implementa selección aleatoria.
- Impide que alguien gane más de una vez por evento.
- Garantiza integridad con restricciones de PostgreSQL y transacciones.
- Maneja ejecuciones simultáneas y candidatos insuficientes.
- Conserva snapshots de reglas y candidatos.
- Implementa la visualización de resultados y el historial de ejecuciones.
- Prueba escenarios de concurrencia y rollback.

### Etapa 7 — Reportes, experiencia de usuario y auditoría

- Completa el historial de cambios.
- Implementa reportes de eventos, asistencia, elegibilidad y ganadores.
- Mejora la experiencia visual y los estados vacíos, errores y confirmaciones.
- Añade exportaciones si son necesarias.
- Ejecuta pruebas de extremo a extremo.

### Etapa 8 — Autenticación, autorización y preparación para producción

Solo ahora implementa:

- Autenticación.
- Integración con el proveedor corporativo que se defina.
- Gestión de usuarios.
- Roles y permisos.
- Protección de Server Actions, Route Handlers y páginas.
- Restricciones de acceso a operaciones administrativas.
- Auditoría de identidad del usuario.
- Revisión de exposición de datos personales.
- Configuración de despliegue, backups, logs y recuperación.
- Pruebas de seguridad y aceptación.

La autorización debe verificarse en el servidor. Ocultar botones no constituye un control de acceso.

## 9. Estándares de calidad

En cada etapa:

1. Explica brevemente qué vas a hacer.
2. Inspecciona el código existente antes de modificarlo.
3. Implementa únicamente el alcance aprobado.
4. Evita reemplazar archivos completos cuando baste con cambios localizados.
5. No inventes requisitos empresariales.
6. No introduzcas dependencias sin una razón concreta.
7. No dejes errores de TypeScript, imports rotos o migraciones inconsistentes.
8. Ejecuta los comandos de validación y las pruebas disponibles.
9. Revisa los cambios y enumera los archivos creados o modificados.
10. Documenta las decisiones relevantes y cualquier limitación pendiente.

Cuando una decisión de negocio no esté definida y pueda afectar al modelo de datos, detente y formula una pregunta concreta antes de asumirla.

No afirmes que una prueba pasó si no la ejecutaste.

## 10. Criterios de aceptación globales

El sistema final debe permitir:

- Administrar varias empresas y sus empleados.
- Organizar eventos compartidos entre empresas.
- Registrar asistencia sin invitaciones ni confirmaciones.
- Excluir a una persona de los sorteos de un evento sin afectar otros eventos.
- Configurar sorteos con condiciones AND sobre campos permitidos de empresa y empleado.
- Exigir asistencia por defecto.
- Seleccionar varios ganadores de forma consistente.
- Garantizar que nadie gane dos veces en un mismo evento.
- Consultar los resultados y el historial de ejecución.
- Auditar operaciones importantes.
- Incorporar autenticación y permisos al final sin tener que reescribir los módulos funcionales.

## 11. Primera tarea

Comienza únicamente por la **Etapa 0 — Inspección y planificación**.

Inspecciona el repositorio y presenta:

- Estado actual del proyecto.
- Arquitectura propuesta adaptada al repositorio.
- Dependencias necesarias y sus versiones compatibles.
- Decisiones de diseño pendientes, si las hay.
- Plan de archivos y tareas para la Etapa 1.
- Comandos que utilizarás para verificar la fundación técnica.

No implementes todavía los módulos de empresas, empleados, eventos ni sorteos. Espera mi aprobación antes de iniciar la Etapa 1.