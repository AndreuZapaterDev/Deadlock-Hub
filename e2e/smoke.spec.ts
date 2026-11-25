import { expect, test } from "@playwright/test";

// Páginas clave: deben cargar (sin 4xx/5xx), mostrar un título y no romper en pantallas pequeñas.
const PAGES: [string, RegExp][] = [
  ["/", /deadlock hub/i],
  ["/heroes", /héroes/i],
  ["/heroes/infernus", /infernus/i],
  ["/items", /objetos|tienda/i],
  ["/tier-list", /tier/i],
  ["/meta", /meta/i],
  ["/lanes", /carriles/i],
  ["/counters", /counters/i],
  ["/builds", /builds/i],
  ["/build-planner", /build/i],
  ["/map", /mapa/i],
  ["/ranks", /rangos/i],
  ["/leaderboard", /leaderboard/i],
  ["/players", /jugador/i],
  ["/players/483770846", /.+/],
  ["/live", /directo/i],
  ["/patches", /parches/i],
  ["/patches/diff", /cambios/i],
  ["/crosshair", /crosshair/i],
  ["/mechanics", /mec[áa]nicas/i],
  ["/npcs", /npc/i],
  ["/status", /estado/i],
  ["/about", /acerca/i],
  ["/offline", /sin conexi[óo]n/i],
];

for (const [path, title] of PAGES) {
  test(`carga ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `estado de ${path}`).toBeLessThan(400);
    await expect(page.locator("h1").first()).toContainText(title);
    // En móvil no debe haber scroll horizontal de toda la página.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `scroll horizontal en ${path}`).toBeLessThanOrEqual(1);
  });
}

test("el navegador nunca llama directamente a la API externa (todo pasa por la propia web)", async ({ page, baseURL }) => {
  const forbidden: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    // Las imágenes de héroes/objetos (assets-bucket) y los avatares de Steam sí salen del navegador; la API de datos, nunca.
    if (u.hostname === "api.deadlock-api.com" || (u.protocol.startsWith("http") && u.origin !== new URL(baseURL!).origin && /deadlock-api.com$/.test(u.hostname) && u.hostname !== "assets-bucket.deadlock-api.com")) forbidden.push(r.url());
  });
  for (const path of ["/", "/heroes", "/heroes/infernus", "/items", "/players/483770846", "/map", "/live", "/patches"]) {
    await page.goto(path, { waitUntil: "networkidle" });
  }
  expect(forbidden, "peticiones directas a la API desde el navegador").toEqual([]);
});

test("una partida enlazada desde el historial de un jugador carga", async ({ page }) => {
  await page.goto("/players/483770846#history");
  const link = page.locator("a[href^='/matches/']").first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/matches\/\d+/);
  await expect(page.locator("h1").first()).toContainText(/partida/i);
});

test("el buscador de jugadores lleva al perfil con un SteamID32", async ({ page }) => {
  await page.goto("/players");
  // El selector de idioma del encabezado también es un combobox: se busca el del buscador por su nombre.
  const box = page.getByRole("combobox", { name: /buscar jugador|search player/i }).first();
  await box.fill("483770846");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/players\/483770846/);
});


test("el cambio Día/Noche se recuerda", async ({ page }) => {
  await page.goto("/");
  const before = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: /día|noche|tema/i }).first().click();
  // El cambio se hace dentro de una View Transition (asíncrona): se espera a que el atributo cambie.
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", before!);
  const after = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", after!);
});

test("manifest, robots y sitemap existen", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
  expect((await request.get("/robots.txt")).ok()).toBeTruthy();
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/heroes/infernus");
});

test("el service worker se registra y la wiki visitada se ve sin conexión", async ({ page, context }) => {
  await page.goto("/heroes/infernus");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // la recarga ya pasa por el worker (lo guarda)
  await page.waitForTimeout(500);
  await context.setOffline(true);
  const res = await page.goto("/heroes/infernus").catch(() => null);
  expect(res?.status() ?? 200).toBeLessThan(400);
  await expect(page.locator("h1").first()).toContainText(/infernus/i);
  await context.setOffline(false);
});

test("el selector de idioma ofrece los 6 idiomas y cambia el de la web y el de los textos del juego", async ({ page }) => {
  await page.goto("/");
  const select = page.getByRole("combobox", { name: /idioma del juego|game language/i });
  await expect(select.locator("option")).toHaveCount(6);
  await expect(select).toBeEnabled();
  await select.selectOption("english");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/heroes");
  await expect(page.getByRole("navigation").first()).toContainText("Heroes");
  // los nombres del juego también salen en inglés (en español Infernus es «Infernus» pero el rol y las etiquetas cambian de idioma)
  await expect(page.locator("main")).toContainText(/Tier|win rate|victor/i);
});

test("todas las tarjetas de héroe miden lo mismo (aunque falte el rol o el nombre sea largo)", async ({ page }) => {
  await page.goto("/heroes");
  const cards = page.locator("main a[href^='/heroes/']:has(h3)");
  await expect(cards.first()).toBeVisible();
  const boxes = await cards.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }));
  expect(boxes.length).toBeGreaterThan(20);
  expect(new Set(boxes.map((b) => b.h)).size, `alturas distintas: ${[...new Set(boxes.map((b) => b.h))].join(", ")}`).toBe(1);
  expect(new Set(boxes.map((b) => b.w)).size, "anchos distintos").toBe(1);
});

test("la cookie de idioma se respeta también en producción (la página no queda prerenderizada en español)", async ({ browser, baseURL }) => {
  for (const [lang, htmlLang, nav] of [["german", "de", "Helden"], ["russian", "ru", "Герои"], ["french", "fr", "Héros"]] as const) {
    const ctx = await browser.newContext();
    await ctx.addCookies([{ name: "lang", value: lang, url: baseURL! }]);
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", htmlLang);
    await expect(page.getByRole("navigation").first()).toContainText(nav);
    await ctx.close();
  }
});


test("el mapa: capas, ficha de un objetivo, zoom y capas en la URL", async ({ page }) => {
  await page.goto("/map");
  const objetivos = page.getByRole("checkbox", { name: "Objetivos" });
  await expect(objetivos).toBeChecked();
  await page.getByRole("button", { name: /^Guardián · Equipo A/ }).first().click({ force: true });
  await expect(page.getByText("Vida máxima")).toBeVisible();
  const zoom = page.locator("[aria-live=polite]", { hasText: "×" }).first();
  await expect(zoom).toContainText("×1.0");
  await page.getByRole("button", { name: "Acercar" }).click();
  await expect(zoom).not.toContainText("×1.0");
  await page.getByRole("button", { name: "Restablecer la vista" }).click();
  await expect(zoom).toContainText("×1.0");
  await objetivos.uncheck();
  await expect(page).toHaveURL(/capas=/);
  expect(new URL(page.url()).searchParams.get("capas")).not.toContain("objectives");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Objetivos" })).not.toBeChecked();
  await page.getByRole("button", { name: "Por defecto" }).click();
  await expect(page).not.toHaveURL(/capas=/);
});

test("los filtros del mapa piden el heatmap con los parámetros correctos, se ven como chips y viajan en la URL", async ({ page }) => {
  const sel = (label: string) => page.locator("label", { hasText: label }).locator("select").first();
  await page.goto("/map");
  await expect(page.getByText(/muertes · .* kills en total/)).toBeVisible();
  const heat = (re: RegExp) => page.waitForRequest((r) => r.url().includes("/api/map/heat") && re.test(r.url()));

  const hero = heat(/hero_id=\d+/);
  await sel("Héroe").selectOption("infernus");
  expect((await hero).url()).toContain("hero_id=1");

  const minutes = heat(/to=20/);
  await sel("Hasta el minuto").selectOption("20");
  expect((await minutes).url()).toMatch(/hero_id=1.*to=20|to=20.*hero_id=1/);

  const ranked = heat(/mode=ranked/);
  await sel("Tipo de partida").selectOption("ranked");
  await ranked;

  await expect(page.locator("details span.rounded-full", { hasText: "Minutos 0–20" })).toBeVisible();
  await expect(page.getByText("3 activos")).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("hero")).toBe("infernus");

  // al recargar se conservan (también el zoom compartido) y «Quitar filtros» los limpia
  await page.reload();
  await expect(sel("Héroe")).toHaveValue("infernus");
  await expect(sel("Hasta el minuto")).toHaveValue("20");
  await page.getByRole("button", { name: "Quitar filtros" }).click();
  await expect(sel("Héroe")).toHaveValue("");
  await expect.poll(() => new URL(page.url()).searchParams.get("hero")).toBeNull();
});

test("el mapa recupera el zoom y el centro de una URL compartida y el buscador encuentra lugares", async ({ page }) => {
  await page.goto("/map?z=4&cx=0.4&cy=0.6");
  await expect(page.locator("[aria-live=polite]", { hasText: "×" }).first()).toContainText("×4.0");
  await expect(page.getByRole("img", { name: /Minivista/ })).toBeVisible();
  await page.getByRole("button", { name: "Restablecer la vista" }).click();
  await expect(page.getByRole("img", { name: /Minivista/ })).toHaveCount(0);
  await page.getByLabel("Buscar en el mapa").fill("tienda");
  await page.locator("ul[id] li button").first().click();
  await expect(page.getByText("Tiendas · Equipo", { exact: false }).first()).toBeVisible();
});

test("la ficha de héroe: menú fijo, historia sin etiquetas, calculadora de nivel y barras frente a la media", async ({ page }) => {
  await page.goto("/heroes/infernus");
  // el lore se parte en párrafos: nunca salen etiquetas <br> sueltas
  await expect(page.locator("main")).not.toContainText("<br");
  // pestañas: solo se ve una a la vez; al abrir una se muestra su contenido y queda marcada
  const tabs = page.getByRole("tablist", { name: "Secciones de la ficha" });
  await expect(page.locator("#abilities-t")).toBeHidden();
  await tabs.getByRole("tab", { name: "Habilidades" }).click();
  await expect(tabs.getByRole("tab", { name: "Habilidades" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#abilities-t")).toBeVisible();
  // calculadora: subir de nivel aumenta la vida
  await tabs.getByRole("tab", { name: "Estadísticas" }).click();
  const vida = page.locator("dl[aria-live=polite] div", { hasText: /^Vida/ }).locator("dd").first();
  const v1 = Number((await vida.innerText()).replace(/\D/g, ""));
  await page.getByRole("slider").fill("20");
  await expect.poll(async () => Number((await vida.innerText()).replace(/\D/g, ""))).toBeGreaterThan(v1);
  await expect(page.getByText(/Nº \d+ de 44/).first()).toBeVisible();
  await expect(page.getByRole("img", { name: /Daño del arma según la distancia/ })).toBeVisible();
});

test("la lista de héroes: tier y win rate en las tarjetas, orden, filtro por tier, vista de tabla y comparar varios", async ({ page }) => {
  await page.goto("/heroes");
  await expect(page.locator("main a[href^='/heroes/']:has(h3)").first().getByText(/victorias/)).toBeVisible();
  // ordenar por win rate: el primero tiene más win rate que el último
  await page.goto("/heroes?sort=winrate");
  const rates = await page.locator("main a[href^='/heroes/']:has(h3)").evaluateAll((els) => els.map((e) => Number((e.textContent ?? "").match(/(\d+[.,]\d)\s*%\s*victorias/)?.[1].replace(",", ".") ?? NaN)));
  expect(rates[0]).toBeGreaterThanOrEqual(rates[rates.length - 1]);
  // filtro por tier
  await page.goto("/heroes?tier=S");
  const n = await page.locator("main a[href^='/heroes/']:has(h3)").count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(44);
  // vista de tabla
  await page.goto("/heroes?vista=tabla");
  await expect(page.getByRole("table")).toBeVisible();
  // comparar: elegir dos héroes abre la barra y enlaza al comparador
  await page.goto("/heroes");
  await page.getByRole("button", { name: /Comparar/ }).nth(0).click();
  await page.getByRole("button", { name: /Comparar/ }).nth(1).click();
  const tray = page.getByRole("region", { name: "Héroes a comparar" });
  await expect(tray).toContainText("Comparar (2/3)");
  await expect(tray.getByRole("link", { name: "Comparar" })).toHaveAttribute("href", /\/heroes\/compare\?h=.+,.+/);
});

test("héroes: vista por tier, héroe aleatorio y sección de rendimiento en la ficha", async ({ page }) => {
  await page.goto("/heroes?vista=tiers");
  await expect(page.getByRole("region", { name: /^Tier [SABCD]$/ }).first()).toBeVisible();
  await page.goto("/heroes");
  await page.getByRole("link", { name: /Héroe aleatorio/ }).click();
  await expect(page).toHaveURL(/\/heroes\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // el rendimiento por rango y semana viene de la API real; si hay muestra se pinta la sección
  await page.goto("/heroes/infernus#meta");
  await expect(page.getByRole("heading", { name: "Rendimiento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Win rate por rango" })).toBeVisible();
});

test("comparar héroes: elegir en el selector, ver la tabla y las gráficas de rendimiento", async ({ page }) => {
  await page.goto("/heroes/compare?h=infernus");
  await page.getByLabel("Héroe 2").selectOption("espectro");
  await expect(page).toHaveURL(/h=infernus,espectro/);
  await expect(page.getByRole("heading", { name: "Estadísticas base" })).toBeVisible();
  await page.getByLabel("Héroe 3 (opcional)").selectOption("siete");
  await expect(page).toHaveURL(/h=infernus,espectro,siete/);
  await expect(page.getByRole("heading", { name: "Rendimiento por rango y semana" })).toBeVisible();
});

test("objetos: win rate en la lista, orden por win rate y ficha con comparación y parecidos", async ({ page }) => {
  await page.goto("/items?sort=winrate&cat=weapon&tier=2");
  const rates = await page.locator("main a[href^='/items/'] span[title='Win rate']").allInnerTexts();
  expect(rates.length).toBeGreaterThan(3);
  const nums = rates.map((t) => Number(t.replace(",", ".").replace(/[^\d.]/g, "")));
  expect(nums[0]).toBeGreaterThanOrEqual(nums[nums.length - 1]);
  await page.locator("main a[href^='/items/']").first().click();
  await expect(page.getByRole("heading", { name: "Objetos parecidos" })).toBeVisible();
  await expect(page.getByText(/Es el nº \d+ de \d+ objetos/)).toBeVisible();
});

test("rendimiento: los tooltips de objetos se piden al pasar el ratón (no van en la página) y salen bien", async ({ page }) => {
  await page.goto("/items");
  const html = await page.content();
  expect(html).not.toContain("Se construye con"); // ningún tooltip pintado de antemano
  const tooltip = page.waitForResponse((r) => /\/api\/items\/.+\/tooltip/.test(r.url()) && r.ok());
  const tile = page.locator("main a[href^='/items/']").first();
  await tile.hover();
  await tooltip;
  await expect(page.locator("[role=tooltip]").filter({ hasText: /almas/ }).first()).toBeAttached();
});

test("rendimiento: la matriz de counters es una cuadrícula accesible y sus celdas navegan", async ({ page }) => {
  await page.goto("/counters");
  const grid = page.getByRole("grid").first();
  await expect(grid).toBeVisible();
  const cells = await page.locator("[role=gridcell]").count();
  expect(cells).toBeGreaterThan(1500);
  // un solo nodo por celda: antes eran <td> + <a>
  expect(await page.evaluate(() => document.getElementsByTagName("*").length)).toBeLessThan(3500);
  await page.locator("a[role=gridcell]").first().click();
  await expect(page).toHaveURL(/counters\?.*/);
});

test("rendimiento: /live pinta 30 partidas y deja ver más; las gráficas se cargan al acercarse", async ({ page }) => {
  await page.goto("/live");
  const rows = page.locator("main ul > li");
  await expect(rows.first()).toBeVisible();
  const first = await rows.count();
  expect(first).toBeLessThanOrEqual(30);
  // con pocas partidas en curso no hay botón: solo se comprueba si la API tiene más de 30
  const more = page.getByRole("button", { name: /Mostrar más/ });
  if (await more.count()) {
    await more.click();
    expect(await rows.count()).toBeGreaterThan(first);
  }

  // en una ficha de héroe la gráfica (Recharts) no viene en los scripts iniciales
  const scripts: number[] = [];
  page.on("response", async (r) => { if (r.request().resourceType() === "script") scripts.push((await r.body().catch(() => Buffer.alloc(0))).length); });
  await page.goto("/heroes/infernus", { waitUntil: "load" });
  const initial = scripts.reduce((a, b) => a + b, 0);
  expect(initial / 1024).toBeLessThan(900); // antes ~1.180 kB con Recharts incluido
});
