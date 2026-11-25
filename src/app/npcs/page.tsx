import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { getNpcs } from "@/lib/lookup";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("npcs");
  return { title: t("title"), description: t("metaDesc") };
}
export const revalidate = 43200;

export default async function NpcsPage() {
  const [all, t] = await Promise.all([getNpcs(), getTranslations("npcs")]);
  const named = all.filter((n) => n.name);
  const rows = named.map((n) => ({
    id: n.id,
    name: n.name!,
    health: n.max_health ?? 0,
    walk: n.walk_speed ?? 0,
    melee: n.melee_damage ?? 0,
    dps: Math.round(n.weapon_info?.damage_per_second ?? 0),
  }));

  return (
    <div className="space-y-8">
      <PosterHeader title={t("title")} subtitle={t("subtitle")} />
      <Card>
        <p className="max-w-prose text-sm text-ink-muted">
          {t("intro", { named: named.length, all: all.length })}
        </p>
      </Card>
      <SortableTable
        columns={[
          { key: "name", label: t("colUnit") },
          { key: "health", label: t("colHealth"), numeric: true },
          { key: "walk", label: t("colWalk"), numeric: true },
          { key: "melee", label: t("colMelee"), numeric: true },
          { key: "dps", label: t("colDps"), numeric: true },
        ]}
        rows={rows}
        initialSort={{ key: "health", dir: "desc" }}
        format={{ health: "num", walk: "num", melee: "num", dps: "num" }}
      />
    </div>
  );
}
