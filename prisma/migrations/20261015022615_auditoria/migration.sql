-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "evento_id" UUID,
    "entidad" VARCHAR(50) NOT NULL,
    "entidad_id" VARCHAR(60),
    "accion" VARCHAR(50) NOT NULL,
    "actor" VARCHAR(150),
    "antes" JSONB,
    "despues" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_evento_id_created_at_idx" ON "auditoria"("evento_id", "created_at");

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");
