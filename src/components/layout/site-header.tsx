import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/deco";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SearchBox } from "@/components/ui/search-box";
import { getLanguage } from "@/lib/language";
import { CommandPalette } from "./command-palette";
import { LanguageSelect } from "./language-select";
import { MobileNav } from "./mobile-nav";
import { MobileSearch } from "./mobile-search";
import { NAV_GROUPS } from "./nav-config";
import { NavMenu } from "./nav-menu";
import { NavMore } from "./nav-more";
import { ThemeToggle } from "./theme-toggle";

const NAV = ["heroes", "items", "tierList", "meta", "lanes", "builds", "map", "players", "live", "patches"] as const;
const HREF: Record<(typeof NAV)[number], string> = {
  heroes: "/heroes", items: "/items", tierList: "/tier-list", meta: "/meta", lanes: "/lanes", builds: "/builds", map: "/map", players: "/players", live: "/live", patches: "/patches",
};

export async function SiteHeader() {
  const [t, language] = await Promise.all([getTranslations(), getLanguage()]);
  const groups = NAV_GROUPS.map((g) => ({ title: t(`nav.${g.key}`), links: g.links.map((l) => ({ href: l.href, label: t(l.label) })) }));
  const palette = (
    <CommandPalette
      pages={groups.flatMap((g) => g.links)}
      labels={{ open: t("palette.open"), title: t("palette.title"), placeholder: t("palette.placeholder"), hero: t("palette.hero"), item: t("palette.item"), page: t("palette.page"), player: t("palette.player"), none: t("palette.none"), hintKeys: t("palette.hintKeys") }}
    />
  );
  const settings = (
    <>
      <LanguageSelect current={language} label={t("language.label")} />
      <ThemeToggle dayLabel={t("theme.day")} nightLabel={t("theme.night")} />
    </>
  );
  return (
    <>
    <header className="sticky top-0 z-40 bg-bg/90 shadow-[0_1px_0_var(--brass),0_4px_0_-3px_var(--brass)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 lg:py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-[0.08em]">
          <Emblem className="h-9 w-9" />
          <span>Deadlock <span className="text-brass">Hub</span></span>
        </Link>
        {/* Escritorio: buscador, ajustes y menú completo en la cabecera. */}
        <SearchBox className="hidden w-80 lg:block" label={t("search.label")} placeholder={t("search.placeholder")} />
        <div className="ml-auto hidden items-center gap-3 lg:flex">{palette}{settings}</div>
        <div className="hidden w-full items-center gap-2 lg:flex">
          <nav aria-label={t("nav.label")} className="-mx-4 min-w-0 flex-1 overflow-x-auto px-4">
            <NavMenu items={NAV.map((k) => ({ href: HREF[k], label: t(`nav.${k}`) }))} />
          </nav>
          <NavMore label={t("nav.more")} groups={groups} />
        </div>
        {/* Móvil: solo logo y lupa; el resto va en la barra inferior y el panel «Más». */}
        <MobileSearch openLabel={t("search.open")} label={t("search.label")} placeholder={t("search.placeholder")} />
      </div>
      <ScrollProgress />
    </header>
    <MobileNav
      groups={groups}
      labels={{
        bar: t("nav.bar"), home: t("nav.home"), heroes: t("nav.heroes"), players: t("nav.players"), live: t("nav.live"), more: t("nav.more"),
        menu: t("nav.menu"), close: t("nav.close"), searchLabel: t("search.label"), searchPlaceholder: t("search.placeholder"), settings: t("nav.settings"),
      }}
    >
      {settings}
    </MobileNav>
    </>
  );
}
