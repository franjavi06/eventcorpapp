import { expect, test } from "@playwright/test";

test.describe("dashboard", () => {
  test("muestra el título y la navegación principal", async ({ page }) => {
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
  });
});
