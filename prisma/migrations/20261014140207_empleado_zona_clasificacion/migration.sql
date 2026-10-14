/*
  Warnings:

  - You are about to drop the column `clase_nomina` on the `empleados` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "empleados" DROP COLUMN "clase_nomina",
ADD COLUMN     "clasificacion" VARCHAR(50),
ADD COLUMN     "zona" VARCHAR(100);
