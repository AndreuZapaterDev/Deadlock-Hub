"use client";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { MAP_SIZE, type View } from "./use-pan-zoom";

export type SearchItem = { id: string; label: string; sub: string; left: number; top: number; pick: () => void };

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();

/** Buscador de lugares del mapa (objetivos, campamentos, tiendas, teletransportadores…): al elegir uno, se centra y se abre su ficha. */
export function MapSearch({ items }: { items: SearchItem[] }) {
  const t = useTranslations("mapUi");
  const [q, setQ] = useState("");
  const listId = useId();
  const results = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    return items.filter((i) => norm(`${i.label} ${i.sub}`).includes(n)).slice(0, 8);
  }, [q, items]);

  return (
    <div className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        aria-controls={listId}
        autoComplete="off"
        className="w-full rounded-sm border border-brass/50 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:border-brass"
      />
      {q.trim().length >= 2 && (
        <ul id={listId} className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-sm border border-brass/50 bg-surface shadow-card">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted">{t("searchNone", { q })}</li>
          ) : (
            results.map((r) => (
              <li key={r.id}>
                <button type="button" className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-brass/15 focus-visible:bg-brass/15" onClick={() => { r.pick(); setQ(""); }}>
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-xs text-ink-muted">{r.sub}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Minivista de orientación: aparece con zoom y marca qué parte del mapa se está viendo. Pulsar (o arrastrar) sobre ella mueve la vista.
 * `image` es el minimapa si hay imágenes remotas.
 */
export function MiniMap({ view, image, onJump }: { view: View; image?: string; onJump: (left: number, top: number) => void }) {
  const t = useTranslations("mapUi");
  const S = 100;
  const size = S / view.k;
  const left = (-view.x / (view.k * MAP_SIZE)) * S;
  const top = (-view.y / (view.k * MAP_SIZE)) * S;
  const jump = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.type === "pointermove" && e.buttons !== 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    onJump(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      role="img"
      aria-label={t("miniMap")}
      className="absolute bottom-3 right-3 z-10 size-28 cursor-pointer touch-none rounded-sm border border-brass/70 bg-night/90 shadow-card sm:size-32"
      onPointerDown={(e) => { e.stopPropagation(); jump(e); }}
      onPointerMove={(e) => { e.stopPropagation(); jump(e); }}
    >
      {image && <image href={image} width={S} height={S} opacity={0.8} />}
      <rect x={left} y={top} width={size} height={size} fill="var(--brass)" fillOpacity={0.18} stroke="var(--brass)" strokeWidth={1.5} />
    </svg>
  );
}
