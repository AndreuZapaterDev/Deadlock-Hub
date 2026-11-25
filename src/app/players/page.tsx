import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FollowedPlayers } from "@/components/player/follows";
import { SearchAutocomplete } from "@/components/player/search-autocomplete";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { resolveVanity, searchPlayers } from "@/lib/player-data";
import { parseSteamQuery } from "@/lib/steam-id";
import type { SearchResult } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("players");
  return { title: t("title"), description: t("metaDesc") };
}


export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getTranslations("players");
  const FORMATS = [
    ["SteamID32", "483770846"],
    ["SteamID64", "76561198444036574"],
    [t("fmtProfileUrl"), "steamcommunity.com/profiles/76561198444036574"],
    [t("fmtVanity"), "steamcommunity.com/id/heavenlydelusions"],
    ["SteamID3", "[U:1:483770846]"],
    [t("fmtName"), "cosmetical"],
  ];
  const q = ((await searchParams).q ?? "").trim();
  const parsed = parseSteamQuery(q);

  // Un ID o una URL con SteamID64 llevan directamente al perfil
  if (parsed.kind === "account") redirect(`/players/${parsed.accountId}`);

  let results: SearchResult[] = [];
  let note: string | null = null;
  if (parsed.kind === "vanity") {
    const { id, candidates } = await resolveVanity(parsed.vanity);
    if (id !== null) redirect(`/players/${id}`);
    results = candidates;
    note = t("vanityNote", { name: parsed.vanity });
  } else if (parsed.kind === "name") {
    results = await searchPlayers(parsed.query);
  }

  return (
    <div className="space-y-10">
      <PosterHeader title={t("title")} subtitle={t("subtitle")} />
      <SearchAutocomplete initial={q} />

      {q && (
        <section aria-labelledby="results" className="space-y-4">
          <SectionTitle id="results">{t("resultsFor", { q })}</SectionTitle>
          {note && <p className="text-sm text-ink-muted">{note}</p>}
          {results.length === 0 ? (
            <EmptyState title={t("noneFound")} hint={t("noneHint")} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <li key={r.id}>
                  <Link href={`/players/${r.id}`} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-3 shadow-card transition-colors hover:bg-brass/10">
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-brass bg-poster font-display font-black text-cream">{r.name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.name}</span>
                      <span className="block text-xs text-ink-muted">{t("matches30d", { count: r.matches30d, id: r.id })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ul aria-label={t("shortcuts")} className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/leaderboard", title: t("scLeaderboard"), text: t("scLeaderboardText") },
          { href: "/players/compare", title: t("scCompare"), text: t("scCompareText") },
          { href: "/live", title: t("scLive"), text: t("scLiveText") },
        ].map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="block h-full rounded-md border border-brass/30 bg-surface p-4 shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-brass hover:shadow-pop">
              <span className="block font-display text-lg font-black">{s.title} <span aria-hidden className="text-brass">→</span></span>
              <span className="mt-1 block text-sm text-ink-muted">{s.text}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="followed" className="space-y-4">
        <SectionTitle id="followed">{t("followed")}</SectionTitle>
        <FollowedPlayers />
      </section>

      <Card>
        <details>
          <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass">{t("whatToType")}</summary>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {FORMATS.map(([k, v]) => (
              <div key={k} className="flex flex-col"><dt className="font-semibold">{k}</dt><dd className="break-all font-mono text-xs text-ink-muted">{v}</dd></div>
            ))}
          </dl>
        </details>
      </Card>
    </div>
  );
}
