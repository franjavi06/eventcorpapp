import { expect, test } from "@playwright/test";

const sufijo = Date.now().toString(36).slice(-6).toUpperCase();

test.describe("flujo de evento con reporte y auditoría", () => {
  test("crea datos vía API y verifica detalle, reporte y auditoría", async ({
    page,
  }) => {
    const request = page.request;
    const loginRes = await request.post("/api/auth/login", {
      data: {
        identificador: process.env.ADMIN_INITIAL_USER ?? "admin",
        password: process.env.ADMIN_INITIAL_PASSWORD ?? "Admin123!",
      },
    });
    expect(loginRes.status()).toBe(200);

    // --- Semilla determinista vía API ---
    const empresaRes = await request.post("/api/empresas", {
      data: { codigo: `E2E-${sufijo}`, nombre: `Empresa E2E ${sufijo}` },
    });
    expect(empresaRes.status()).toBe(201);
    const { data: empresa } = await empresaRes.json();

    const empleadoRes = await request.post("/api/empleados", {
      data: {
        empresaId: empresa.id,
        codigo: `EMP-${sufijo}`,
        nombres: "E2E",
        apellidos: "Test",
        correo: `e2e-${sufijo.toLowerCase()}@test.dev`,
        fechaIngreso: "2020-01-01",
      },
    });
    expect(empleadoRes.status()).toBe(201);
    const { data: empleado } = await empleadoRes.json();

    const eventoRes = await request.post("/api/eventos", {
      data: {
        codigo: `EVT-${sufijo}`,
        nombre: `Evento E2E ${sufijo}`,
        fechaInicio: "2026-12-01T18:00",
        fechaFin: "2026-12-01T23:00",
      },
    });
    expect(eventoRes.status()).toBe(201);
    const { data: evento } = await eventoRes.json();

    const assocRes = await request.post(`/api/eventos/${evento.id}/empresas`, {
      data: { empresaId: empresa.id },
    });
    expect(assocRes.status()).toBe(201);

    const checkInRes = await request.post(
      `/api/eventos/${evento.id}/asistencias`,
      { data: { empleadoId: empleado.id } },
    );
    expect(checkInRes.status()).toBe(201);

    // --- Detalle del evento: enlaces a las nuevas vistas ---
    await page.goto(`/eventos/${evento.id}`, { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { name: evento.nombre }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Reporte", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Auditoría", exact: true }),
    ).toBeVisible();

    // --- Reporte ---
    await page.goto(`/eventos/${evento.id}/reporte`, { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { name: `Reporte — ${evento.nombre}` }),
    ).toBeVisible();
    await expect(page.getByText(empresa.nombre)).toBeVisible();

    // --- Auditoría ---
    await page.goto(`/eventos/${evento.id}/auditoria`, { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", { name: `Auditoría — ${evento.nombre}` }),
    ).toBeVisible();
    await expect(page.getByText("CREAR")).toBeVisible();
    await expect(page.getByText("CHECK_IN")).toBeVisible();

    // --- Desactivar datos de prueba para no contaminar el dashboard ---
    await request.patch(`/api/eventos/${evento.id}`, {
      data: { estado: "CANCELADO" },
    });
    await request.patch(`/api/empresas/${empresa.id}`, {
      data: { activo: false },
    });
  });
});
