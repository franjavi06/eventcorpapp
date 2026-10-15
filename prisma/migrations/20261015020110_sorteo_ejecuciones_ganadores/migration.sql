-- CreateEnum
CREATE TYPE "SorteoEjecucionEstado" AS ENUM ('COMPLETADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "sorteo_ejecuciones" (
    "id" UUID NOT NULL,
    "sorteo_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "estado" "SorteoEjecucionEstado" NOT NULL,
    "cantidad_solicitada" INTEGER NOT NULL,
    "total_candidatos" INTEGER NOT NULL,
    "reglas_snapshot" JSONB NOT NULL,
    "candidatos_snapshot" JSONB NOT NULL,
    "error" VARCHAR(500),
    "ejecutado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ejecutado_por" VARCHAR(150),

    CONSTRAINT "sorteo_ejecuciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sorteo_ganadores" (
    "id" UUID NOT NULL,
    "ejecucion_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "empleado_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sorteo_ganadores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sorteo_ejecuciones_sorteo_id_estado_idx" ON "sorteo_ejecuciones"("sorteo_id", "estado");

-- CreateIndex
CREATE INDEX "sorteo_ejecuciones_evento_id_idx" ON "sorteo_ejecuciones"("evento_id");

-- CreateIndex
CREATE INDEX "sorteo_ganadores_ejecucion_id_idx" ON "sorteo_ganadores"("ejecucion_id");

-- CreateIndex
CREATE UNIQUE INDEX "sorteo_ganadores_evento_id_empleado_id_key" ON "sorteo_ganadores"("evento_id", "empleado_id");

-- AddForeignKey
ALTER TABLE "sorteo_ejecuciones" ADD CONSTRAINT "sorteo_ejecuciones_sorteo_id_fkey" FOREIGN KEY ("sorteo_id") REFERENCES "sorteos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorteo_ejecuciones" ADD CONSTRAINT "sorteo_ejecuciones_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorteo_ganadores" ADD CONSTRAINT "sorteo_ganadores_ejecucion_id_fkey" FOREIGN KEY ("ejecucion_id") REFERENCES "sorteo_ejecuciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sorteo_ganadores" ADD CONSTRAINT "sorteo_ganadores_evento_id_empleado_id_fkey" FOREIGN KEY ("evento_id", "empleado_id") REFERENCES "evento_participantes"("evento_id", "empleado_id") ON DELETE RESTRICT ON UPDATE CASCADE;
