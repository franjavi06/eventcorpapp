-- CreateEnum
CREATE TYPE "EventoEstado" AS ENUM ('BORRADOR', 'ACTIVO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "eventos" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" VARCHAR(1000),
    "ubicacion" VARCHAR(200),
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" "EventoEstado" NOT NULL DEFAULT 'BORRADOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_empresas" (
    "evento_id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_empresas_pkey" PRIMARY KEY ("evento_id","empresa_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eventos_codigo_key" ON "eventos"("codigo");

-- CreateIndex
CREATE INDEX "eventos_estado_idx" ON "eventos"("estado");

-- CreateIndex
CREATE INDEX "eventos_fecha_inicio_idx" ON "eventos"("fecha_inicio");

-- CreateIndex
CREATE INDEX "evento_empresas_empresa_id_idx" ON "evento_empresas"("empresa_id");

-- AddForeignKey
ALTER TABLE "evento_empresas" ADD CONSTRAINT "evento_empresas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_empresas" ADD CONSTRAINT "evento_empresas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint (añadido manualmente): rango de fechas coherente
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_fechas_coherentes" CHECK ("fecha_inicio" <= "fecha_fin");
