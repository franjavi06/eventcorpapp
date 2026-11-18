ALTER TABLE "sorteo_ejecuciones"
  ADD COLUMN "es_adicional" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "motivo" VARCHAR(300);
