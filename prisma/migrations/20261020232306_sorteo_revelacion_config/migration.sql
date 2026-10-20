-- CreateEnum
CREATE TYPE "ModoRevelacion" AS ENUM ('AUTOMATICO', 'MANUAL');

-- AlterTable
ALTER TABLE "sorteos" ADD COLUMN     "duracion_animacion_segundos" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "modo_revelacion" "ModoRevelacion" NOT NULL DEFAULT 'AUTOMATICO';
