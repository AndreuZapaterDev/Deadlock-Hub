import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { getNpcs } from "@/lib/lookup";

export const metadata: Metadata = { title: "NPCs", description: "Guardianes, walkers, tropas y criaturas neutrales de Deadlock con sus estadísticas." };
export const revalidate = 43200;

export default async function NpcsPage() {
  const all = await getNpcs();
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
      <PosterHeader title="NPCs" subtitle="Guardianes, walkers, tropas y criaturas del mapa" />
      <Card>
        <p className="max-w-prose text-sm text-ink-muted">
          {named.length} unidades con nombre (de {all.length} entradas en los datos; el resto son plantillas internas). Los valores vienen tal cual de la API:
          ordena por cualquier columna. Un 0 significa que la unidad no tiene ese dato.
        </p>
      </Card>
      <SortableTable
        columns={[
          { key: "name", label: "Unidad" },
          { key: "health", label: "Vida", numeric: true },
          { key: "walk", label: "Velocidad de marcha", numeric: true },
          { key: "melee", label: "Daño cuerpo a cuerpo", numeric: true },
          { key: "dps", label: "Daño de arma por s", numeric: true },
        ]}
        rows={rows}
        initialSort={{ key: "health", dir: "desc" }}
        format={{ health: "num", walk: "num", melee: "num", dps: "num" }}
      />
    </div>
  );
}
