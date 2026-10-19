import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  Gift,
  Info,
  Link2,
  type LucideIcon,
  MoonStar,
  ScrollText,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Paso = {
  titulo: string;
  icono: LucideIcon;
  descripcion: string;
  acciones: React.ReactNode[];
  importante?: string;
};

const code = (children: React.ReactNode) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
    {children}
  </code>
);

const PASOS: Paso[] = [
  {
    titulo: "Empresas del grupo",
    icono: Building2,
    descripcion:
      "Registra primero las empresas que participarán en los eventos. Cada empresa se identifica por un código único.",
    acciones: [
      <>
        Ve a <strong>Empresas</strong> → <strong>Nueva empresa</strong> y
        completa código, nombre, clasificación y ubicación.
      </>,
      <>
        Desde la tarjeta de cada empresa puedes <strong>Editar</strong> o{" "}
        <strong>activar/desactivar</strong>. Una empresa inactiva conserva sus
        empleados y su historial, pero no puede habilitarse en eventos nuevos.
      </>,
    ],
    importante:
      "El código de empresa es único y no puede repetirse. Las desactivaciones son lógicas: nada se borra.",
  },
  {
    titulo: "Empleados (alta individual)",
    icono: Users,
    descripcion:
      "Cada empleado pertenece a una sola empresa. El alta manual está en Empleados → Nuevo empleado.",
    acciones: [
      <>
        <strong>Obligatorios:</strong> código, nombres, apellidos y fecha de
        ingreso. El {code("codigo")} es único dentro de cada empresa.
      </>,
      <>
        <strong>Opcionales:</strong> identificación, correo, teléfono,
        departamento, puesto, zona y clasificación.
      </>,
      <>
        {code("correo")} e {code("identificacion")} son únicos en todo el
        sistema <em>cuando se informan</em>; si el empleado no tiene, déjalos
        vacíos (nunca uses valores genéricos como {code("0")} o{" "}
        {code("N/A")}, porque chocarían entre empleados).
      </>,
    ],
  },
  {
    titulo: "Carga masiva de empleados",
    icono: FileSpreadsheet,
    descripcion:
      "Para registrar muchos empleados de golpe, usa el archivo Excel .xlsx en Empleados → Carga masiva.",
    acciones: [
      <>
        Ve a <strong>Empleados</strong> → <strong>Carga masiva</strong> y pulsa{" "}
        <strong>Descargar plantilla</strong> para obtener el formato correcto de
        columnas.
      </>,
      <>
        Columnas: {code("codigo")}, {code("identificacion")},{" "}
        {code("nombres")}, {code("apellidos")}, {code("correo")},{" "}
        {code("telefono")} (o {code("celular")}), {code("departamento")},{" "}
        {code("puesto")}, {code("zona")}, {code("clasificacion")},{" "}
        {code("fecha_ingreso")}.
      </>,
      <>
        Selecciona la <strong>empresa destino</strong>, elige el archivo y pulsa{" "}
        <strong>Importar empleados</strong>.
      </>,
      <>
        La importación es <strong>parcial</strong>: las filas válidas se
        registran y las que fallan se reportan una a una con su número de fila,
        campo y motivo.
      </>,
    ],
    importante:
      "Límite: 1000 filas y 5 MB por archivo. fecha_ingreso acepta celdas de fecha de Excel, YYYY-MM-DD, dd/mm/yyyy, dd-mm-yyyy y dd.mm.yyyy. Los duplicados (código en la empresa, correo o identificación ya registrados) se reportan sin detener el resto del archivo.",
  },
  {
    titulo: "Eventos",
    icono: CalendarDays,
    descripcion:
      "Un evento es una actividad corporativa con fecha de inicio y fin, compartida entre varias empresas del grupo.",
    acciones: [
      <>
        Ve a <strong>Eventos</strong> → <strong>Nuevo evento</strong> y completa
        código, nombre, fechas, ubicación y estado.
      </>,
      <>
        Desde la tarjeta del evento entra a su detalle para editar los datos y
        administrar todo lo demás.
      </>,
      <>
        Los estados del evento (borrador, activo, finalizado, cancelado) se
        gestionan desde el propio detalle del evento.
      </>,
    ],
  },
  {
    titulo: "Empresas habilitadas del evento",
    icono: Link2,
    descripcion:
      "Dentro del detalle del evento defines qué empresas participan. Al asociar una empresa, todos sus empleados activos se inscriben automáticamente como participantes.",
    acciones: [
      <>
        En el detalle del evento, sección{" "}
        <strong>Empresas habilitadas</strong>, agrega empresas activas del
        grupo. Al pulsar <strong>Asociar</strong> verás cuántos empleados se
        inscribieron.
      </>,
      <>
        Al <strong>quitar</strong> una empresa se eliminan sus participantes
        que aún no registraron asistencia. Si alguno ya hizo check-in o ganó un
        sorteo, la desasociación se bloquea.
      </>,
      <>
        Los empleados dados de alta <em>después</em> de asociar la empresa no
        se inscriben solos: añádelos desde Participantes o regístralos
        directamente en el check-in.
      </>,
    ],
    importante:
      "Si un empleado no aparece en el buscador de participantes o check-in, verifica que su empresa esté habilitada y activa, y que el empleado esté activo.",
  },
  {
    titulo: "Participantes y check-in",
    icono: ClipboardCheck,
    descripcion:
      "Los participantes son los empleados incorporados al evento — al habilitar empresas la mayoría ya estará inscrita. La asistencia se registra en el check-in.",
    acciones: [
      <>
        <strong>Participantes</strong>: desde el detalle del evento →
        Participantes, el botón <strong>Añadir participante</strong> abre un
        buscador por código, identificación, nombre o correo para
        incorporaciones puntuales.
      </>,
      <>
        <strong>Check-in</strong>: mismo buscador, pero registra la asistencia
        del día. Si el empleado aún no era participante, se incorpora y se
        marca su asistencia en un solo paso.
      </>,
      <>
        <strong>Exclusión de sorteos</strong>: en la tabla de participantes
        puedes excluir a una persona de los sorteos indicando el motivo. La
        exclusión es solo de ese evento y no impide asistir.
      </>,
    ],
    importante:
      "Un empleado solo puede ser participante una vez por evento y tener un único registro de asistencia. La asistencia y la elegibilidad son independientes.",
  },
  {
    titulo: "Sorteos",
    icono: Gift,
    descripcion:
      "Cada evento puede tener varios sorteos con sus propias reglas. Se administran desde el detalle del evento → Sorteos.",
    acciones: [
      <>
        <strong>Nuevo sorteo</strong>: define nombre, descripción, cantidad de
        ganadores, orden y si la <strong>asistencia es obligatoria</strong>{" "}
        (por defecto sí).
      </>,
      <>
        <strong>Reglas</strong>: agrega condiciones sobre campos permitidos de
        EMPRESA o EMPLEADO (por ejemplo, departamento = VENTAS). Todas las
        reglas deben cumplirse (se combinan con Y/AND).
      </>,
      <>
        <strong>Elegibles</strong>: la vista previa muestra cuántos candidatos
        cumplen las condiciones en tiempo real.
      </>,
      <>
        <strong>Ejecutar</strong>: el panel de ejecución anima la tómbola y
        revela a los ganadores. Antes de sortear, el sistema valida que haya
        suficientes candidatos.
      </>,
      <>
        El <strong>historial de ejecuciones</strong> conserva cada ejecución
        con sus ganadores, reglas aplicadas y resultado.
      </>,
    ],
    importante:
      "Regla fundamental: una persona puede ganar como máximo una vez por evento, sin importar cuántos sorteos existan. Una vez ejecutado, el sorteo queda en solo lectura; una repetición autorizada se registra como nueva ejecución, sin borrar la anterior.",
  },
  {
    titulo: "Reportes",
    icono: BarChart3,
    descripcion:
      "Consulta métricas del evento y del sistema una vez registrados los datos.",
    acciones: [
      <>
        <strong>Reporte del evento</strong> (detalle del evento → Reporte):
        participantes, asistencia, elegibilidad y ganadores por sorteo.
      </>,
      <>
        <strong>Reportes</strong> (menú lateral): vista global de eventos,
        asistencia y sorteos realizados.
      </>,
    ],
  },
  {
    titulo: "Auditoría",
    icono: ScrollText,
    descripcion:
      "Todas las operaciones relevantes quedan registradas con fecha, entidad y valores anteriores/nuevos.",
    acciones: [
      <>
        Detalle del evento → <strong>Auditoría</strong>: cambios del evento,
        empresas habilitadas, participantes, asistencias, reglas de sorteos y
        ejecuciones.
      </>,
      <>
        Úsala para verificar quién/qué cambió y cuándo, especialmente ante
        exclusiones o repeticiones de sorteos.
      </>,
    ],
  },
];

export function Instructivo() {
  return (
    <div className="space-y-8">
      <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-indigo-500" />
            Flujo general
          </CardTitle>
          <CardDescription>
            El orden recomendado de trabajo es:{" "}
            <strong>
              Empresas → Empleados → Evento → Empresas habilitadas →
              Participantes/Check-in → Sorteos → Reportes
            </strong>
            . Cada paso puede revisarse después desde su módulo. Usa el selector
            del menú lateral{" "}
            <MoonStar className="inline size-3.5 align-text-bottom" /> para
            alternar entre tema claro y oscuro.
          </CardDescription>
        </CardHeader>
      </Card>

      <ol className="space-y-6">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="relative pl-12">
            <span className="absolute left-0 top-4 flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
              {i + 1}
            </span>
            {i < PASOS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-4 top-12 bottom-[-1.5rem] w-px bg-border"
              />
            )}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <paso.icono className="size-4 text-indigo-500" />
                  {paso.titulo}
                </CardTitle>
                <CardDescription>{paso.descripcion}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  {paso.acciones.map((accion, j) => (
                    <li key={j}>{accion}</li>
                  ))}
                </ul>
                {paso.importante && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                    <Badge
                      variant="outline"
                      className="mr-2 border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      Importante
                    </Badge>
                    {paso.importante}
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium">
                El sorteo dice que no hay suficientes candidatos
              </dt>
              <dd className="text-muted-foreground">
                Revisa la vista previa de elegibles: si el sorteo exige
                asistencia, solo cuentan quienes hicieron check-in; además se
                descartan excluidos, quienes ya ganaron en el evento y quienes
                no cumplan las reglas configuradas.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                ¿Puedo repetir un sorteo ya ejecutado?
              </dt>
              <dd className="text-muted-foreground">
                La configuración queda en solo lectura tras ejecutarse. Una
                repetición autorizada genera una nueva ejecución en el
                historial; los resultados anteriores se conservan.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                Un empleado no aparece en el buscador de participantes
              </dt>
              <dd className="text-muted-foreground">
                Confirma que el empleado esté activo, que su empresa esté
                activa y habilitada para el evento, y que el texto de búsqueda
                coincida con código, identificación, nombre o correo.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                ¿Dónde se excluye a alguien de un sorteo?
              </dt>
              <dd className="text-muted-foreground">
                En <Link href="/eventos" className="text-primary hover:underline">Eventos</Link>
                {" "}→ detalle del evento → Participantes, acción{" "}
                <strong>Excluir de sorteos</strong> con motivo. Es por evento y
                no afecta la asistencia ni otros eventos.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
