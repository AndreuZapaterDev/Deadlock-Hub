/** Estructura de navegación compartida por el menú de escritorio y el menú/barra inferior del móvil. `label` es una clave de next-intl. */
export type NavLink = { href: string; label: string };
export type NavGroup = { key: "groupWiki" | "groupMeta" | "groupPlay" | "groupTools"; links: NavLink[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "groupWiki",
    links: [
      { href: "/heroes", label: "nav.heroes" },
      { href: "/items", label: "nav.items" },
      { href: "/map", label: "nav.map" },
      { href: "/ranks", label: "footer.ranks" },
      { href: "/npcs", label: "footer.npcs" },
      { href: "/mechanics", label: "footer.mechanics" },
    ],
  },
  {
    key: "groupMeta",
    links: [
      { href: "/tier-list", label: "nav.tierList" },
      { href: "/meta", label: "nav.meta" },
      { href: "/lanes", label: "nav.lanes" },
      { href: "/builds", label: "nav.builds" },
      { href: "/counters", label: "counters.title" },
      { href: "/heroes/compare", label: "nav.compareHeroes" },
      { href: "/patches", label: "nav.patches" },
      { href: "/patches/diff", label: "patchDiff.title" },
    ],
  },
  {
    key: "groupPlay",
    links: [
      { href: "/players", label: "nav.players" },
      { href: "/live", label: "nav.live" },
      { href: "/leaderboard", label: "leaderboard.title" },
      { href: "/players/compare", label: "players.cmpTitle" },
    ],
  },
  {
    key: "groupTools",
    links: [
      { href: "/build-planner", label: "footer.planner" },
      { href: "/crosshair", label: "footer.crosshair" },
    ],
  },
];
