import { expect, test } from "@playwright/test";

test.describe("paleta de búsqueda (escritorio)", () => {
  test.skip(({ isMobile }) => isMobile, "solo escritorio");

  test("Ctrl+K abre la paleta y Enter navega a la sección elegida", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Búsqueda rápida" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").fill("tier");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/tier-list/);
    await expect(dialog).toBeHidden();
  });

  test("el menú «Más» muestra el mapa completo del sitio", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle"); // espera a la hidratación: antes de ella el clic no hace nada
    await page.getByRole("button", { name: /^Más/ }).click();
    await expect(page.getByRole("region", { name: "Wiki" }).getByRole("link", { name: "Mecánicas" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: "Wiki" }).getByRole("link", { name: "Mecánicas" })).toBeHidden();
  });
});

test.describe("filtros plegables (móvil)", () => {
  test.skip(({ isMobile }) => !isMobile, "solo móvil");

  test("los filtros de la tier list empiezan plegados y se despliegan", async ({ page }) => {
    await page.goto("/tier-list", { waitUntil: "domcontentloaded" });
    const toggle = page.getByRole("button", { name: /Filtros/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Parche")).toBeVisible();
  });
});

test.describe("accesibilidad básica", () => {
  test("el enlace «Saltar al contenido» recibe el foco primero y apunta al contenido", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute("href", "#contenido");
  });

  for (const path of ["/", "/heroes", "/tier-list", "/patches/diff"]) {
    test(`${path} no tiene scroll horizontal`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }
});

test.describe("favoritos", () => {
  test("un héroe marcado como favorito aparece en la portada", async ({ page }) => {
    await page.goto("/heroes", { waitUntil: "domcontentloaded" });
    const first = page.locator('a[href^="/heroes/"]:not([href="/heroes/compare"])').first();
    const href = await first.getAttribute("href");
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Favorito/ }).click();
    await expect(page.getByRole("button", { name: /En favoritos/ })).toHaveAttribute("aria-pressed", "true");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: "Tus favoritos" })).toBeVisible();
  });
});

test.describe("filtros", () => {
  test("el filtro «Tipo» de héroes muestra el valor elegido y reduce la lista", async ({ page }) => {
    await page.goto("/heroes", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const toggle = page.getByRole("button", { name: /^Filtros/ });
    if (await toggle.isVisible()) await toggle.click(); // móvil: el panel empieza plegado
    const cards = page.locator('main a[href^="/heroes/"]:not([href="/heroes/compare"])');
    const before = await cards.count();
    const type = page.locator('main select[name="type"]');
    const value = (await type.locator("option").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value).filter(Boolean)))[0];
    await type.selectOption(value);
    await expect(type).toHaveValue(value); // se ve al instante, sin esperar al servidor
    await expect(page).toHaveURL(new RegExp(`type=${value}`));
    await expect.poll(() => cards.count()).toBeLessThan(before);
  });
});
