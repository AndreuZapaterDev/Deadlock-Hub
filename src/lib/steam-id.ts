// Conversión y reconocimiento de identificadores de Steam. Sin dependencias de servidor: sirve en cliente y en servidor.
// La API de Deadlock usa SteamID32 (`account_id`).

/** SteamID64 = SteamID32 + este desplazamiento (se usa BigInt: un SteamID64 no cabe en un `number` seguro). */
export const STEAM64_OFFSET = 76561197960265728n;
const MAX32 = 0xffffffffn;

export const steam64ToAccountId = (id: bigint | string): number => Number(BigInt(id) - STEAM64_OFFSET);
export const accountIdToSteam64 = (id: number | string): string => (BigInt(id) + STEAM64_OFFSET).toString();

export type ParsedQuery =
  | { kind: "account"; accountId: number; from: "id32" | "id64" | "url" | "steamid3" | "steamid2" }
  | { kind: "vanity"; vanity: string }
  | { kind: "name"; query: string }
  | { kind: "empty" };

const PROFILE_URL = /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/(profiles|id)\/([^/?#\s]+)/i;
const STEAMID3 = /^\[U:1:(\d+)\]$/i;
const STEAMID2 = /^STEAM_[0-5]:([01]):(\d+)$/i;

const isId64 = (n: bigint) => n >= STEAM64_OFFSET && n <= STEAM64_OFFSET + MAX32;
const isId32 = (n: bigint) => n > 0n && n <= MAX32;

/**
 * Interpreta lo que escribe el usuario en el buscador:
 * SteamID32, SteamID64, SteamID3 (`[U:1:n]`), SteamID2 (`STEAM_0:1:n`), URL de perfil (`/profiles/<id64>` o `/id/<vanity>`) o un nombre.
 * Un número fuera de rango se trata como nombre (alguien puede llamarse "12345678901234567890").
 */
export function parseSteamQuery(input: string): ParsedQuery {
  const q = input.trim();
  if (!q) return { kind: "empty" };

  const url = PROFILE_URL.exec(q);
  if (url) {
    const value = decodeURIComponent(url[2]);
    if (url[1].toLowerCase() === "profiles" && /^\d+$/.test(value) && isId64(BigInt(value))) {
      return { kind: "account", accountId: steam64ToAccountId(value), from: "url" };
    }
    return { kind: "vanity", vanity: value };
  }

  if (/^\d+$/.test(q)) {
    const n = BigInt(q);
    if (isId64(n)) return { kind: "account", accountId: steam64ToAccountId(n), from: "id64" };
    if (isId32(n)) return { kind: "account", accountId: Number(n), from: "id32" };
    return { kind: "name", query: q };
  }

  const s3 = STEAMID3.exec(q);
  if (s3 && isId32(BigInt(s3[1]))) return { kind: "account", accountId: Number(s3[1]), from: "steamid3" };

  const s2 = STEAMID2.exec(q);
  if (s2) {
    const id = BigInt(s2[2]) * 2n + BigInt(s2[1]);
    if (isId32(id)) return { kind: "account", accountId: Number(id), from: "steamid2" };
  }

  return { kind: "name", query: q };
}

/** Valida el `accountId` de una ruta (`/players/[accountId]`): entero positivo de 32 bits. */
export function parseAccountId(param: string): number | null {
  if (!/^\d{1,10}$/.test(param)) return null;
  const n = BigInt(param);
  return isId32(n) ? Number(n) : null;
}
