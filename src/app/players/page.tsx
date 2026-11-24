import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FollowedPlayers } from "@/components/player/follows";
import { SearchAutocomplete } from "@/components/player/search-autocomplete";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { resolveVanity, searchPlayers } from "@/lib/player-data";
import { parseSteamQuery } from "@/lib/steam-id";
import type { SearchResult } from "@/lib/types";

export const metadata: Metadata = { title: "Jugadores", description: "Busca cualquier jugador de Deadlock por nombre, SteamID o URL de perfil." };

const FORMATS = [
  ["SteamID32", "483770846"],
  ["SteamID64", "76561198444036574"],
  ["URL de perfil", "steamcommunity.com/profiles/76561198444036574"],
  ["Nombre de perfil", "steamcommunity.com/id/heavenlydelusions"],
  ["SteamID3", "[U:1:483770846]"],
  ["Nombre", "cosmetical"],
];

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
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
    note = `No hay ningún perfil exacto con el nombre «${parsed.vanity}». Estas son las coincidencias más cercanas.`;
  } else if (parsed.kind === "name") {
    results = await searchPlayers(parsed.query);
  }

  return (
    <div className="space-y-10">
      <PosterHeader title="Jugadores" subtitle="Encuentra una cuenta y mira su perfil, historial y héroes" />
      <SearchAutocomplete initial={q} />

      {q && (
        <section aria-labelledby="results" className="space-y-4">
          <SectionTitle id="results">Resultados para «{q}»</SectionTitle>
          {note && <p className="text-sm text-ink-muted">{note}</p>}
          {results.length === 0 ? (
            <EmptyState title="No hemos encontrado ningún jugador" hint="Comprueba el nombre o prueba con el SteamID o la URL de su perfil de Steam." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <li key={r.id}>
                  <Link href={`/players/${r.id}`} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-3 shadow-card transition-colors hover:bg-brass/10">
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-brass bg-poster font-display font-black text-cream">{r.name.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.name}</span>
                      <span className="block text-xs text-ink-muted">{r.matches30d} partidas en 30 días · #{r.id}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="followed" className="space-y-4">
        <SectionTitle id="followed">Jugadores que sigues</SectionTitle>
        <FollowedPlayers />
      </section>

      <section aria-labelledby="formats" className="space-y-4">
        <SectionTitle id="formats">Qué puedes escribir</SectionTitle>
        <Card>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {FORMATS.map(([k, v]) => (
              <div key={k} className="flex flex-col"><dt className="font-semibold">{k}</dt><dd className="break-all font-mono text-xs text-ink-muted">{v}</dd></div>
            ))}
          </dl>
        </Card>
      </section>
    </div>
  );
}
