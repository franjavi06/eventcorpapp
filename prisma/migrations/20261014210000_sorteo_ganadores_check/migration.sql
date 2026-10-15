ALTER TABLE "sorteos" ADD CONSTRAINT "sorteos_cantidad_ganadores_positiva"
  CHECK ("cantidad_ganadores" > 0);
