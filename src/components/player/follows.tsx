"use client";
import Link from "next/link";
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
  const list = useFollows();
  const following = list.some((f) => f.id === id);
  return (
    <Button variant={following ? "secondary" : "primary"} aria-pressed={following} onClick={() => write(following ? list.filter((f) => f.id !== id) : [...list, { id, name }])}>
      {following ? "Siguiendo ✓" : "Seguir jugador"}
    </Button>
  );
}

/** Lista de jugadores seguidos (visible en /players). */
export function FollowedPlayers() {
  const list = useFollows();
  if (!list.length) {
    return <p className="text-sm text-ink-muted">Aún no sigues a nadie. Entra en un perfil y pulsa «Seguir jugador» para tenerlo aquí.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-brass/30 bg-surface p-3 shadow-card">
          <Link href={`/players/${f.id}`} className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{f.name}</span>
            <span className="text-xs text-ink-muted">#{f.id}</span>
          </Link>
          <button type="button" aria-label={`Dejar de seguir a ${f.name}`} onClick={() => write(list.filter((x) => x.id !== f.id))} className="rounded-sm px-2 py-1 text-sm text-ink-muted hover:bg-brass/15 hover:text-ink">✕</button>
        </li>
      ))}
    </ul>
  );
}
