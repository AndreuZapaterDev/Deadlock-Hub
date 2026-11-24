import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { fmtNum, timeAgo } from "@/lib/format";
import { itemCount, type BuildEntry } from "@/lib/builds";

/** Tarjeta de una build en el buscador: nombre, héroe, autor, popularidad, objetos y etiquetas. Enlaza al detalle. */
export function BuildCard({ build, heroName, authorName, tags }: { build: BuildEntry; heroName: string; authorName?: string; tags: string[] }) {
  const h = build.hero_build;
  return (
    <Link href={`/builds/${h.hero_id}/${h.hero_build_id}`} className="group flex h-full flex-col gap-3 rounded-md border border-brass/30 bg-surface p-4 shadow-card transition-colors hover:bg-brass/10">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-display text-lg font-black leading-tight">{h.name}</h3>
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-brass" title="Veces marcada como favorita">★ {fmtNum(build.num_favorites ?? 0)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="lilac">{heroName}</Chip>
        {tags.map((t) => <Chip key={t}>{t}</Chip>)}
      </div>
      <p className="mt-auto text-xs text-ink-muted">
        {authorName ?? `Autor #${h.author_account_id}`} · {itemCount(build)} objetos · v{h.version} · actualizada {timeAgo(h.last_updated_timestamp)}
      </p>
    </Link>
  );
}
