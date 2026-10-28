-- CreateTable
CREATE TABLE "sorteo_cuotas" (
    "id" UUID NOT NULL,
    "sorteo_id" UUID NOT NULL,
    "entidad" "ReglaEntidad" NOT NULL DEFAULT 'EMPLEADO',
    "campo" VARCHAR(50) NOT NULL,
    "valor" VARCHAR(300) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sorteo_cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sorteo_cuotas_sorteo_id_activo_idx" ON "sorteo_cuotas"("sorteo_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "sorteo_cuotas_sorteo_id_entidad_campo_valor_key" ON "sorteo_cuotas"("sorteo_id", "entidad", "campo", "valor");

-- AddForeignKey
ALTER TABLE "sorteo_cuotas" ADD CONSTRAINT "sorteo_cuotas_sorteo_id_fkey" FOREIGN KEY ("sorteo_id") REFERENCES "sorteos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
