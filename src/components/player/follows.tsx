"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export type Followed = { id: number; name: string };
const KEY = "followed-players";

// Favoritos en localStorage (no hay base de datos propia). Todo con try/catch: puede estar bloqueado o vacío.
function read(): string {
  try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; }
}
function write(list: Followed[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin almacenamiento: no se recuerda */ }
  window.dispatchEvent(new Event("follows-changed"));
}
const subscribe = (cb: () => void) => {
  window.addEventListener("follows-changed", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("follows-changed", cb); window.removeEventListener("storage", cb); };
};

function useFollows() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const list = useMemo<Followed[]>(() => { try { return JSON.parse(raw); } catch { return []; } }, [raw]);
  return list;
}

export function FollowButton({ id, name }: { id: number; name: string }) {
  const t = useTranslations("players");
  const list = useFollows();
  const following = list.some((f) => f.id === id);
  return (
    <Button variant={following ? "secondary" : "primary"} aria-pressed={following} onClick={() => write(following ? list.filter((f) => f.id !== id) : [...list, { id, name }])}>
      {following ? t("following") : t("follow")}
    </Button>
  );
}

/** Lista de jugadores seguidos (visible en /players). */
export function FollowedPlayers() {
  const t = useTranslations("players");
  const list = useFollows();
  if (!list.length) {
    return <p className="text-sm text-ink-muted">{t("noFollowed")}</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-brass/30 bg-surface p-3 shadow-card">
          <Link href={`/players/${f.id}`} className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{f.name}</span>
            <span className="text-xs text-ink-muted">#{f.id}</span>
          </Link>
          <button type="button" aria-label={t("unfollow", { name: f.name })} onClick={() => write(list.filter((x) => x.id !== f.id))} className="rounded-sm px-2 py-1 text-sm text-ink-muted hover:bg-brass/15 hover:text-ink">✕</button>
        </li>
      ))}
    </ul>
  );
}

/** Franja de la pantalla de inicio: los jugadores seguidos, para entrar a su perfil en un toque. No pinta nada si no sigues a nadie. */
export function FollowedStrip() {
  const t = useTranslations("home");
  const list = useFollows();
  if (!list.length) return null;
  return (
    <section aria-label={t("followedLabel")} className="space-y-3">
      <h2 className="font-display text-xl font-black">{t("followedTitle")}</h2>
      <ul className="flex flex-wrap gap-2">
        {list.map((f) => (
          <li key={f.id}>
            <Link href={`/players/${f.id}`} className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-surface px-4 py-2 text-sm font-semibold hover:bg-brass/15">
              {f.name}<span className="text-xs font-normal text-ink-muted">#{f.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
