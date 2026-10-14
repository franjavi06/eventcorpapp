-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "clasificacion" VARCHAR(50),
    "ubicacion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "identificacion" VARCHAR(30),
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(200) NOT NULL,
    "departamento" VARCHAR(100),
    "puesto" VARCHAR(100),
    "clase_nomina" VARCHAR(30),
    "fecha_ingreso" DATE NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_codigo_key" ON "empresas"("codigo");

-- CreateIndex
CREATE INDEX "empresas_activo_idx" ON "empresas"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_identificacion_key" ON "empleados"("identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_correo_key" ON "empleados"("correo");

-- CreateIndex
CREATE INDEX "empleados_empresa_id_idx" ON "empleados"("empresa_id");

-- CreateIndex
CREATE INDEX "empleados_apellidos_nombres_idx" ON "empleados"("apellidos", "nombres");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_empresa_id_codigo_key" ON "empleados"("empresa_id", "codigo");

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
