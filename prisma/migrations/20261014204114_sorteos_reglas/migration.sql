-- CreateEnum
CREATE TYPE "SorteoEstado" AS ENUM ('BORRADOR', 'ACTIVO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ReglaEntidad" AS ENUM ('EMPRESA', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "ReglaOperador" AS ENUM ('IGUAL', 'DISTINTO', 'CONTIENE', 'ANTES_DE', 'DESPUES_DE');

-- CreateTable
CREATE TABLE "sorteos" (
    "id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" VARCHAR(500),
    "cantidad_ganadores" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "SorteoEstado" NOT NULL DEFAULT 'BORRADOR',
    "asistencia_obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sorteos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sorteo_reglas" (
    "id" UUID NOT NULL,
    "sorteo_id" UUID NOT NULL,
    "entidad" "ReglaEntidad" NOT NULL,
    "campo" VARCHAR(50) NOT NULL,
    "operador" "ReglaOperador" NOT NULL,
    "valor" VARCHAR(300) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sorteo_reglas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sorteos_evento_id_estado_idx" ON "sorteos"("evento_id", "estado");

-- CreateIndex
CREATE INDEX "sorteo_reglas_sorteo_id_activo_idx" ON "sorteo_reglas"("sorteo_id", "activo");

-- AddForeignKey
ALTER TABLE "sorteos" ADD CONSTRAINT "sorteos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorteo_reglas" ADD CONSTRAINT "sorteo_reglas_sorteo_id_fkey" FOREIGN KEY ("sorteo_id") REFERENCES "sorteos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
