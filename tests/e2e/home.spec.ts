import { expect, test } from "@playwright/test";

test.describe("dashboard y autenticación", () => {
  test("redirige a /login sin sesión y muestra el dashboard tras autenticarse", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    const loginRes = await page.request.post("/api/auth/login", {
      data: {
        identificador: process.env.ADMIN_INITIAL_USER ?? "admin",
        password: process.env.ADMIN_INITIAL_PASSWORD ?? "Admin123!",
      },
    });
    expect(loginRes.status()).toBe(200);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    const nav = page.getByRole("navigation", {
      name: "Navegación principal",
    });
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Empresas" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Empleados" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Eventos" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reportes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Usuarios" })).toBeVisible();
  });
});
