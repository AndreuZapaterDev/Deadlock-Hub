import { expect, test } from "@playwright/test";

// Navegación móvil: barra inferior + panel «Más». Solo tiene sentido en el proyecto «movil» (por debajo de `lg`).
test.describe("navegación móvil", () => {
  test.skip(({ isMobile }) => !isMobile, "solo móvil");

  test("la barra inferior es visible y el panel «Más» navega y se cierra con Esc", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle"); // espera a la hidratación: antes de ella los clics no hacen nada
    const bar = page.getByRole("navigation", { name: /Navegación rápida/ });
    await expect(bar).toBeVisible();

    const more = bar.getByRole("button", { name: "Más" });
    await more.click();
    const dialog = page.getByRole("dialog", { name: "Menú" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await more.click();
    await dialog.getByRole("link", { name: "Tier list" }).click();
    await expect(page).toHaveURL(/\/tier-list/);
    await expect(dialog).toBeHidden();
  });

  test("la lupa de la cabecera abre el buscador de jugadores", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle"); // espera a la hidratación: antes de ella los clics no hacen nada
    await page.getByRole("button", { name: "Abrir búsqueda" }).click();
    await expect(page.locator("#header-search")).toBeFocused();
  });
});
