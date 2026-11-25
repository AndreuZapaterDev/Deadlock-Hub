import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MapView } from "@/components/map/map-view";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { getHeroes, getNpcs, getRanks } from "@/lib/lookup";
import { buildScene, parseLayers } from "@/lib/map";
import { pickFilterState } from "@/lib/map-filters";
import { loadMap } from "@/lib/map-data";
import { loadBigDays } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mapUi");
  return { title: t("title"), description: t("metaDesc") };
}

type SP = Record<string, string | undefined>;
const num = (v: string | undefined, min: number, max: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

export default async function MapPage({ searchParams }: { searchParams: Promise<SP> }) {
  const [sp, t] = await Promise.all([searchParams, getTranslations("mapUi")]);
  const [mapRes, heroes, npcs, ranks, bigDays] = await Promise.all([loadMap(), getHeroes(), getNpcs(), getRanks(), loadBigDays()]);
  if (!mapRes.ok) {
    return (
      <div className="space-y-8">
        <PosterHeader compact title={t("title")} subtitle={t("subtitleShort")} />
        <ErrorState title={t("loadError")} hint={t("loadErrorHint")} />
      </div>
    );
  }
  const scene = buildScene(mapRes.data, npcs, true);

  // Vista compartida: ?z=3.5&cx=0.42&cy=0.6 (zoom y centro). Lo inválido se ignora.
  const z = num(sp.z, 1, 14);
  const cx = num(sp.cx, 0, 1);
  const cy = num(sp.cy, 0, 1);

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <MapView
        scene={scene}
        heroes={[...heroes].sort((a, b) => a.name.localeCompare(b.name)).map((h) => ({ id: h.id, name: h.name, slug: slugify(h.name) }))}
        ranks={ranks.filter((r) => r.tier >= 1).map((r) => ({ tier: r.tier, name: r.name }))}
        patches={[...bigDays].sort().reverse().slice(0, 12).map((d) => d.slice(0, 10))}
        initialLayers={parseLayers(sp.capas)}
        initialFilters={pickFilterState(sp)}
        initialView={z !== undefined && z > 1 && cx !== undefined && cy !== undefined ? { k: z, cx, cy } : undefined}
      />
    </div>
  );
}
