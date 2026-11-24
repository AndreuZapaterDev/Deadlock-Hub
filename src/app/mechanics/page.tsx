import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { SortableTable } from "@/components/ui/sortable-table";
import { getSource } from "@/lib/api";
import { fmtDuration, fmtNum } from "@/lib/format";
import { humanize } from "@/lib/labels";
import { getNpcs } from "@/lib/lookup";

export const metadata: Metadata = { title: "Mecánicas", description: "Almas, objetivos, campamentos neutrales, power-ups y el Rejuvenador, explicados con los datos del juego." };
export const revalidate = 43200;

type Generic = {
  item_price_per_tier: number[];
  objective_params: Record<string, number>;
  rejuv_params: Record<string, number | number[]>;
};
type Misc = { class_name: string; initial_spawn_time?: number; spawn_interval?: number; pickup_chances?: Record<string, number> };
type Buff = { buff_type: string; is_permanent: boolean; pickups: number; avg_first_pickup_time_s: number };
type MapData = { neutral_camps: { kind: string }[] };

const KIND: Record<string, string> = { vault: "Bóveda", strong: "Fuertes", medium: "Medios", weak: "Débiles" };
const SECTIONS = [["souls", "Almas"], ["objectives", "Objetivos"], ["camps", "Campamentos neutrales"], ["powerups", "Power-ups"], ["rejuv", "Rejuvenador"]] as const;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-brass/30 bg-surface p-4 text-center shadow-card">
      <p className="font-display text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
    </div>
  );
}

export default async function MechanicsPage() {
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
    [npcName("npc_boss_tier1", "Guardián"), o.tier1_gold_kill],
    [npcName("npc_boss_tier2", "Walker"), o.tier2_gold_kill],
    ["Guardianes de base", o.base_guardians_gold_kill],
    ["Santuarios", o.shrines_gold_kill],
  ] as const;

  const camps = map.neutral_camps.reduce<Record<string, number>>((a, c) => ((a[c.kind] = (a[c.kind] ?? 0) + 1), a), {});
  const spawner = misc.find((m) => m.class_name === "citadel_item_powerup_spawner");
  const rj = generic.rejuv_params;
  const rejuv = [
    ["Duración del efecto", `${rj.rejuvinator_buff_duration} s`],
    ["Aviso antes de que termine", `${rj.rejuvinator_expiration_warning_timing} s`],
  ];
  const buffRows = buffs.map((b) => ({ id: b.buff_type, type: humanize(b.buff_type), permanent: b.is_permanent ? "Permanente" : "Temporal", pickups: b.pickups, first: Math.round(b.avg_first_pickup_time_s) }));

  return (
    <div className="space-y-12">
      <PosterHeader title="Mecánicas" subtitle="Cómo funcionan las almas, los objetivos y los power-ups" />

      <nav aria-label="Secciones" className="flex flex-wrap justify-center gap-2">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full border border-brass/50 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-bg">{label}</a>)}
      </nav>

      <section id="souls" aria-labelledby="souls-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="souls-t">Almas</SectionTitle>
        <p className="max-w-prose text-ink-muted">
          Las almas son la moneda de la partida: con ellas se compran los objetos de la tienda. Según los datos del juego, el precio depende solo del tier del objeto.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {prices.map((p, i) => <Stat key={i} value={fmtNum(p)} label={`Tier ${i + 1}`} />)}
        </div>
      </section>

      <section id="objectives" aria-labelledby="obj-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="obj-t">Objetivos</SectionTitle>
        <p className="max-w-prose text-ink-muted">
          Destruir las estructuras del mapa da almas. Estas son las cantidades que figuran en los datos del juego al destruir cada una:
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {objectives.map(([name, souls]) => <Stat key={name} value={fmtNum(souls)} label={name} />)}
        </div>
      </section>

      <section id="camps" aria-labelledby="camps-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="camps-t">Campamentos neutrales</SectionTitle>
        <p className="max-w-prose text-ink-muted">
          El mapa tiene {Object.values(camps).reduce((a, b) => a + b, 0)} campamentos de criaturas neutrales repartidos en cuatro categorías.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(camps).map(([k, n]) => <Stat key={k} value={String(n)} label={KIND[k] ?? k} />)}
        </div>
      </section>

      <section id="powerups" aria-labelledby="pu-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="pu-t">Power-ups</SectionTitle>
        {spawner?.initial_spawn_time !== undefined && (
          <Card>
            <p className="max-w-prose text-sm">
              Los power-ups aparecen por primera vez a los <strong>{fmtDuration(spawner.initial_spawn_time)}</strong> de partida y se repiten cada <strong>{fmtDuration(spawner.spawn_interval ?? 0)}</strong>.
              Tipos que pueden salir: {Object.keys(spawner.pickup_chances ?? {}).map((k) => humanize(k.replace(/_pickup$/, ""))).join(", ")}.
            </p>
          </Card>
        )}
        <h3 className="font-display text-lg font-black">Mejoras y power-ups recogidos</h3>
        <SortableTable
          columns={[
            { key: "type", label: "Tipo (id de la API)" },
            { key: "permanent", label: "Efecto" },
            { key: "pickups", label: "Recogidos", numeric: true },
            { key: "first", label: "1.ª recogida media (s)", numeric: true },
          ]}
          rows={buffRows}
          initialSort={{ key: "pickups", dir: "desc" }}
          format={{ pickups: "num", first: "num" }}
        />
      </section>

      <section id="rejuv" aria-labelledby="rj-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="rj-t">Rejuvenador</SectionTitle>
        <p className="max-w-prose text-ink-muted">Valores del efecto del Rejuvenador tal como los entrega el juego:</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {rejuv.map(([k, v]) => <Stat key={k} value={v} label={k} />)}
        </div>
        <p className="text-xs text-ink-muted">Los textos de esta página están escritos para la web a partir de los datos; las cifras se actualizan con cada parche.</p>
      </section>
    </div>
  );
}
