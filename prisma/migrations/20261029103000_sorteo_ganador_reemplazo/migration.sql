-- CreateEnum
CREATE TYPE "SorteoGanadorEstado" AS ENUM ('VALIDO', 'AUSENTE');

-- AlterTable
ALTER TABLE "sorteo_ganadores" ADD COLUMN "posicion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "estado" "SorteoGanadorEstado" NOT NULL DEFAULT 'VALIDO',
ADD COLUMN "motivo_ausencia" VARCHAR(300),
ADD COLUMN "reemplazado_at" TIMESTAMP(3),
ADD COLUMN "reemplazado_por" VARCHAR(150),
ADD COLUMN "reemplaza_a_ganador_id" UUID,
ADD COLUMN "cuota_snapshot" JSONB;

-- Backfill posicion: puesto de adjudicación dentro de cada ejecución
UPDATE "sorteo_ganadores" g
SET "posicion" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "ejecucion_id" ORDER BY "created_at" ASC, "id" ASC
  ) AS rn
  FROM "sorteo_ganadores"
) sub
WHERE g.id = sub.id;

-- CreateIndex
CREATE UNIQUE INDEX "sorteo_ganadores_reemplaza_a_ganador_id_key" ON "sorteo_ganadores"("reemplaza_a_ganador_id");

-- CreateIndex
CREATE INDEX "sorteo_ganadores_evento_id_estado_idx" ON "sorteo_ganadores"("evento_id", "estado");

-- AddForeignKey
ALTER TABLE "sorteo_ganadores" ADD CONSTRAINT "sorteo_ganadores_reemplaza_a_ganador_id_fkey" FOREIGN KEY ("reemplaza_a_ganador_id") REFERENCES "sorteo_ganadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
