import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/deco";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SearchBox } from "@/components/ui/search-box";
import { getLanguage } from "@/lib/language";
import { LanguageSelect } from "./language-select";
import { NavMenu } from "./nav-menu";
import { ThemeToggle } from "./theme-toggle";

const NAV = ["heroes", "items", "tierList", "meta", "builds", "map", "players", "live", "patches"] as const;
const HREF: Record<(typeof NAV)[number], string> = {
  heroes: "/heroes", items: "/items", tierList: "/tier-list", meta: "/meta", builds: "/builds", map: "/map", players: "/players", live: "/live", patches: "/patches",
};

export async function SiteHeader() {
  const [t, language] = await Promise.all([getTranslations(), getLanguage()]);
  return (
    <header className="sticky top-0 z-40 bg-bg/90 shadow-[0_1px_0_var(--brass),0_4px_0_-3px_var(--brass)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-black uppercase tracking-[0.08em]">
          <Emblem className="h-9 w-9" />
          <span>Deadlock <span className="text-brass">Hub</span></span>
        </Link>
        <SearchBox className="order-3 w-full sm:order-none sm:w-80" label={t("search.label")} placeholder={t("search.placeholder")} />
        <div className="ml-auto flex items-center gap-3">
          <LanguageSelect current={language} label={t("language.label")} />
          <ThemeToggle dayLabel={t("theme.day")} nightLabel={t("theme.night")} />
        </div>
        <nav aria-label={t("nav.label")} className="order-4 -mx-4 w-full overflow-x-auto px-4">
          <NavMenu items={NAV.map((k) => ({ href: HREF[k], label: t(`nav.${k}`) }))} />
        </nav>
      </div>
      <ScrollProgress />
    </header>
  );
}
