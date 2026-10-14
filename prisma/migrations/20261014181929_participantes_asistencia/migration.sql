-- CreateTable
CREATE TABLE "evento_participantes" (
    "id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "empleado_id" UUID NOT NULL,
    "participa_sorteos" BOOLEAN NOT NULL DEFAULT true,
    "exclusion_motivo" VARCHAR(300),
    "exclusion_at" TIMESTAMP(3),
    "exclusion_por" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" UUID NOT NULL,
    "evento_participante_id" UUID NOT NULL,
    "registrado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" VARCHAR(150),

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_participantes_evento_id_participa_sorteos_idx" ON "evento_participantes"("evento_id", "participa_sorteos");

-- CreateIndex
CREATE INDEX "evento_participantes_empleado_id_idx" ON "evento_participantes"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "evento_participantes_evento_id_empleado_id_key" ON "evento_participantes"("evento_id", "empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_evento_participante_id_key" ON "asistencias"("evento_participante_id");

-- AddForeignKey
ALTER TABLE "evento_participantes" ADD CONSTRAINT "evento_participantes_evento_id_empresa_id_fkey" FOREIGN KEY ("evento_id", "empresa_id") REFERENCES "evento_empresas"("evento_id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_participantes" ADD CONSTRAINT "evento_participantes_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_evento_participante_id_fkey" FOREIGN KEY ("evento_participante_id") REFERENCES "evento_participantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
