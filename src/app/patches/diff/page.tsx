import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getHeroes, getItems } from "@/lib/lookup";
import { loadPatchDiff, loadVersions } from "@/lib/patch-data";
import type { AssetDiff, Direction, EntityChange, FieldChange, Scalar } from "@/lib/patch-diff";
import { slugify } from "@/lib/slug";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("patchDiff");
  return { title: t("title"), description: t("metaDesc") };
}

type SP = { from?: string; to?: string; kind?: string; dir?: string; q?: string };

const DIR: Record<Direction, { tone: "sage" | "rose" | "neutral"; arrow: string; word: string }> = {
  buff: { tone: "sage", arrow: "▲", word: "wordBuff" },
  nerf: { tone: "rose", arrow: "▼", word: "wordNerf" },
  neutral: { tone: "neutral", arrow: "◆", word: "wordChange" },
};

const show = (v: Scalar | undefined, yes: string, no: string) => (v === undefined ? "—" : typeof v === "boolean" ? (v ? yes : no) : typeof v === "number" ? String(Math.round(v * 100) / 100) : v);

function Change({ c }: { c: FieldChange }) {
  const t = useTranslations("patchDiff");
  const d = DIR[c.direction];
  const color = c.direction === "buff" ? "text-sage-ink" : c.direction === "nerf" ? "text-rose-ink" : "text-ink-muted";
  return (
    <tr className="border-t border-brass/15">
      <th scope="row" className="py-1.5 pr-3 text-left font-normal">{c.label}</th>
      <td className="py-1.5 pr-3 text-right tabular-nums text-ink-muted">{show(c.old, t("yes"), t("no"))}</td>
      <td aria-hidden className="py-1.5 pr-3 text-center text-ink-muted">→</td>
      <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{show(c.new, t("yes"), t("no"))}</td>
      <td className={`py-1.5 text-right tabular-nums ${color}`}>
        <span aria-label={t(d.word)}>{d.arrow}</span>
        {c.pct !== undefined && ` ${c.pct > 0 ? "+" : ""}${c.pct}%`}
      </td>
    </tr>
  );
}

function EntityCard({ e, href }: { e: EntityChange; href?: string }) {
  const t = useTranslations("patchDiff");
  const d = DIR[e.direction];
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 font-display text-lg font-black leading-tight">{href ? <Link href={href} className="hover:text-brass">{e.name}</Link> : e.name}</h3>
        <Chip tone={d.tone}>{d.arrow} {e.direction === "neutral" ? t("mixed") : t(d.word)}</Chip>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("changesOf", { name: e.name })}</caption>
          <tbody>{e.changes.map((c) => <Change key={c.path} c={c} />)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function names(list: { name: string }[]) {
  return list.map((x) => x.name).join(", ");
}

function Section({ title, diff, hrefs, filter }: { title: string; diff: AssetDiff; hrefs: Map<number | string, string>; filter: (e: EntityChange) => boolean }) {
  const t = useTranslations("patchDiff");
  const changed = diff.changed.filter(filter);
  return (
    <section className="space-y-4" aria-label={title}>
      <SectionTitle>{title}</SectionTitle>
      {changed.length === 0 && diff.added.length === 0 && diff.removed.length === 0 ? (
        <EmptyState title={t("noChanges")} />
      ) : (
        <>
          {diff.added.length > 0 && <p className="text-sm"><Chip tone="sage">{t("added")}</Chip> <span className="ml-1">{names(diff.added)}</span></p>}
          {diff.removed.length > 0 && <p className="text-sm"><Chip tone="rose">{t("removed")}</Chip> <span className="ml-1">{names(diff.removed)}</span></p>}
          <div className="grid gap-4 lg:grid-cols-2">{changed.map((e) => <EntityCard key={e.id} e={e} href={hrefs.get(e.id)} />)}</div>
        </>
      )}
    </section>
  );
}

export default async function PatchDiffPage({ searchParams }: { searchParams: Promise<SP> }) {
  const t = await getTranslations("patchDiff");
  const sp = await searchParams;
  const [versions, heroes, items] = await Promise.all([loadVersions(), getHeroes(), getItems()]);
  const from = Number(sp.from) || undefined;
  const to = Number(sp.to) || undefined;
  const res = await loadPatchDiff(from, to);

  const q = (sp.q ?? "").trim().toLowerCase();
  const filter = (e: EntityChange) =>
    (!q || e.name.toLowerCase().includes(q)) && (sp.dir === "buff" ? e.direction === "buff" : sp.dir === "nerf" ? e.direction === "nerf" : true);

  const heroHref = new Map<number | string, string>(heroes.map((h) => [h.id, `/heroes/${slugify(h.name)}`]));
  const itemHref = new Map<number | string, string>(items.map((i) => [i.id, `/items/${i.class_name}`]));
  const opts = versions.slice(0, 60).map((v) => ({ value: String(v.version), label: `${v.version} · ${v.date.slice(0, 10)}` }));

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <Suspense>
        <FilterBar
          fields={[
            { name: "from", label: t("from"), type: "select", allLabel: t("previous"), options: opts },
            { name: "to", label: t("to"), type: "select", allLabel: t("latest"), options: opts },
            { name: "kind", label: t("show"), type: "select", allLabel: t("heroesAndItems"), options: [{ value: "heroes", label: t("onlyHeroes") }, { value: "items", label: t("onlyItems") }] },
            { name: "dir", label: t("changeType"), type: "select", allLabel: t("all"), options: [{ value: "buff", label: t("onlyBuffs") }, { value: "nerf", label: t("onlyNerfs") }] },
            { name: "q", label: t("search"), type: "search", placeholder: t("searchPlaceholder") },
          ]}
        />
      </Suspense>
      {!res.ok ? (
        <ErrorState title={t("compareError")} hint={t("compareErrorHint")} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              [t("heroesChanged"), res.data.heroes.changed.length],
              [t("itemsChanged"), res.data.items.changed.length],
              [t("itemsNew"), res.data.items.added.length],
              [t("itemsRemoved"), res.data.items.removed.length],
              [t("buffs"), [...res.data.heroes.changed, ...res.data.items.changed].filter((e) => e.direction === "buff").length],
              [t("nerfs"), [...res.data.heroes.changed, ...res.data.items.changed].filter((e) => e.direction === "nerf").length],
            ].map(([label, n]) => (
              <Card key={label as string}>
                <dd className="font-display text-3xl font-black tabular-nums">{n}</dd>
                <dt className="text-xs italic text-ink-muted">{label}</dt>
              </Card>
            ))}
          </dl>
          {res.data.from && res.data.to && <p className="text-sm text-ink-muted">{t("versionLine", { from: res.data.from, to: res.data.to })}{res.data.widened && t("widened")}</p>}
          {sp.kind !== "items" && <Section title={t("heroes")} diff={res.data.heroes} hrefs={heroHref} filter={filter} />}
          {sp.kind !== "heroes" && <Section title={t("items")} diff={res.data.items} hrefs={itemHref} filter={filter} />}
        </>
      )}
    </div>
  );
}
