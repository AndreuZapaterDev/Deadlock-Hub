import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { Tabs } from "@/components/ui/tabs";
import { SortableTable } from "@/components/ui/sortable-table";
import { getSource } from "@/lib/api";
import { fmtDuration, fmtNum } from "@/lib/format";
import { humanize } from "@/lib/labels";
import { getNpcs } from "@/lib/lookup";
import { Stat } from "@/components/ui/stat";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mechanics");
  return { title: t("title"), description: t("metaDesc") };
}
export const revalidate = 43200;

type Generic = {
  item_price_per_tier: number[];
  objective_params: Record<string, number>;
  rejuv_params: Record<string, number | number[]>;
};
type Misc = { class_name: string; initial_spawn_time?: number; spawn_interval?: number; pickup_chances?: Record<string, number> };
type Buff = { buff_type: string; is_permanent: boolean; pickups: number; avg_first_pickup_time_s: number };
type MapData = { neutral_camps: { kind: string }[] };

const KIND: Record<string, string> = { vault: "kindVault", strong: "kindStrong", medium: "kindMedium", weak: "kindWeak" };
export default async function MechanicsPage() {
  const [t, th] = await Promise.all([getTranslations("mechanics"), getTranslations("heroes")]);
  const api = getSource();
  const [generic, misc, buffs, map, npcs] = await Promise.all([
    api.get<Generic>("/v1/assets/generic-data").then((r) => r.data),
    api.get<Misc[]>("/v1/assets/misc-entities").then((r) => r.data),
    api.get<Buff[]>("/v1/analytics/buff-stats").then((r) => r.data),
    api.get<MapData>("/v1/assets/map").then((r) => r.data),
    getNpcs(),
  ]);

  const npcName = (cls: string, fallback: string) => npcs.find((n) => n.class_name === cls)?.name ?? fallback;
  const prices = generic.item_price_per_tier.slice(1, 5);
  const o = generic.objective_params;
  const objectives = [
    [npcName("npc_boss_tier1", t("guardian")), o.tier1_gold_kill],
    [npcName("npc_boss_tier2", t("walker")), o.tier2_gold_kill],
    [t("baseGuardians"), o.base_guardians_gold_kill],
    [t("shrines"), o.shrines_gold_kill],
  ] as const;

  const camps = map.neutral_camps.reduce<Record<string, number>>((a, c) => ((a[c.kind] = (a[c.kind] ?? 0) + 1), a), {});
  const spawner = misc.find((m) => m.class_name === "citadel_item_powerup_spawner");
  const rj = generic.rejuv_params;
  const rejuv = [
    [t("rejuvDuration"), `${rj.rejuvinator_buff_duration} s`],
    [t("rejuvWarning"), `${rj.rejuvinator_expiration_warning_timing} s`],
  ];
  const buffRows = buffs.map((b) => ({ id: b.buff_type, type: humanize(b.buff_type), permanent: b.is_permanent ? t("permanent") : t("temporary"), pickups: b.pickups, first: Math.round(b.avg_first_pickup_time_s) }));

  return (
    <div className="space-y-12">
      <PosterHeader title={t("title")} subtitle={t("subtitle")} />

      <Tabs syncHash sticky label={t("tabsLabel")} tabs={[
        { id: "souls", label: t("tabSouls"), content: (
      <section id="souls" aria-labelledby="souls-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="souls-t">{t("tabSouls")}</SectionTitle>
        <p className="max-w-prose text-ink-muted">
          {t("soulsIntro")}
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {prices.map((p, i) => <Stat key={i} value={fmtNum(p)} label={th("tierN", { tier: i + 1 })} />)}
        </div>
      </section>

        ) },
        { id: "objectives", label: t("tabObjectives"), content: (
      <section id="objectives" aria-labelledby="obj-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="obj-t">{t("tabObjectives")}</SectionTitle>
        <p className="max-w-prose text-ink-muted">
          {t("objectivesIntro")}
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {objectives.map(([name, souls]) => <Stat key={name} value={fmtNum(souls)} label={name} />)}
        </div>
      </section>

        ) },
        { id: "camps", label: t("tabCamps"), content: (
      <section id="camps" aria-labelledby="camps-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="camps-t">{t("tabCamps")}</SectionTitle>
        <p className="max-w-prose text-ink-muted">
          {t("campsIntro", { count: Object.values(camps).reduce((a, b) => a + b, 0) })}
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(camps).map(([k, n]) => <Stat key={k} value={String(n)} label={KIND[k] ? t(KIND[k]) : k} />)}
        </div>
      </section>

        ) },
        { id: "powerups", label: t("tabPowerups"), content: (
      <section id="powerups" aria-labelledby="pu-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="pu-t">{t("tabPowerups")}</SectionTitle>
        {spawner?.initial_spawn_time !== undefined && (
          <Card>
            <p className="max-w-prose text-sm">
              {t.rich("powerupsIntro", { first: fmtDuration(spawner.initial_spawn_time), every: fmtDuration(spawner.spawn_interval ?? 0), types: Object.keys(spawner.pickup_chances ?? {}).map((k) => humanize(k.replace(/_pickup$/, ""))).join(", "), b: (c) => <strong>{c}</strong> })}
            </p>
          </Card>
        )}
        <h3 className="font-display text-lg font-black">{t("pickedUp")}</h3>
        <SortableTable
          columns={[
            { key: "type", label: t("colType") },
            { key: "permanent", label: t("colEffect") },
            { key: "pickups", label: t("colPickups"), numeric: true },
            { key: "first", label: t("colFirst"), numeric: true },
          ]}
          rows={buffRows}
          initialSort={{ key: "pickups", dir: "desc" }}
          format={{ pickups: "num", first: "num" }}
        />
      </section>

        ) },
        { id: "rejuv", label: t("tabRejuv"), content: (
      <section id="rejuv" aria-labelledby="rj-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="rj-t">{t("tabRejuv")}</SectionTitle>
        <p className="max-w-prose text-ink-muted">{t("rejuvIntro")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {rejuv.map(([k, v]) => <Stat key={k} value={v} label={k} />)}
        </div>
        <p className="text-xs text-ink-muted">{t("rejuvNote")}</p>
      </section>
        ) },
      ]} />
    </div>
  );
}
