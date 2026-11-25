"use client";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { crosshairShapes, DEFAULTS, fromHex, isValidCode, RANGES, toHex, toQuery, type CrosshairSettings } from "@/lib/crosshair";

type NumKey = keyof typeof RANGES;

const BACKGROUNDS = [
  { id: "night", label: "bgNight", cls: "bg-night" },
  { id: "cream", label: "bgCream", cls: "bg-cream" },
  { id: "poster", label: "bgPoster", cls: "bg-poster" },
  { id: "sage", label: "bgSage", cls: "bg-sage" },
  { id: "accent", label: "bgAccent", cls: "bg-accent" },
] as const;

function Slider({ k, label, s, set, unit = "" }: { k: NumKey; label: string; s: CrosshairSettings; set: (k: NumKey, v: number) => void; unit?: string }) {
  const id = useId();
  const r = RANGES[k];
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <label htmlFor={id} className="font-semibold">{label}</label>
        <output htmlFor={id} className="tabular-nums text-ink-muted">{s[k]}{unit}</output>
      </div>
      <input id={id} type="range" min={r.min} max={r.max} step={r.step} value={s[k]} onChange={(e) => set(k, Number(e.target.value))} className="w-full accent-[var(--brass)]" />
    </div>
  );
}

function Color({ label, rgb, onChange }: { label: string; rgb: [number, number, number]; onChange: (v: [number, number, number]) => void }) {
  const id = useId();
  const hex = toHex(...rgb);
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <label htmlFor={id} className="font-semibold">{label}</label>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-ink-muted">{hex}</span>
        <input id={id} type="color" value={hex} onChange={(e) => { const v = fromHex(e.target.value); if (v) onChange(v); }} className="h-8 w-12 cursor-pointer rounded-sm border border-brass/50 bg-surface" />
      </span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--brass)]" />
    </label>
  );
}

const rgb = (r: number, g: number, b: number) => `rgb(${r} ${g} ${b})`;

/** Editor de crosshair. La vista previa se dibuja aquí (SVG) y responde en tiempo real; el código y la imagen oficial los genera la API. */
export function CrosshairEditor({ initial }: { initial: CrosshairSettings }) {
  const t = useTranslations("crosshair");
  const [s, setS] = useState<CrosshairSettings>(initial);
  const [bg, setBg] = useState<(typeof BACKGROUNDS)[number]["id"]>("night");
  const [zoom, setZoom] = useState(6);
  const [code, setCode] = useState("");
  const [imported, setImported] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<"code" | "import" | null>(null);
  const [official, setOfficial] = useState(false);

  const setNum = (k: NumKey, v: number) => setS((p) => ({ ...p, [k]: v }));
  const shapes = crosshairShapes(s);
  const color = rgb(s.color_r, s.color_g, s.color_b);
  const outline = rgb(s.outline_color_r, s.outline_color_g, s.outline_color_b);
  const query = new URLSearchParams(Object.entries(toQuery(s)).map(([k, v]) => [k, String(v)])).toString();

  async function call(kind: "code" | "import") {
    setBusy(kind); setMsg(null);
    try {
      if (kind === "code") {
        const res = await fetch(`/api/crosshair/code?${query}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "somethingFailed");
        setCode(data.code);
        setMsg({ kind: "ok", text: t("codeGenerated") });
      } else {
        if (!isValidCode(imported.trim())) throw new Error("invalidCode");
        const res = await fetch(`/api/crosshair/settings?code=${encodeURIComponent(imported.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "somethingFailed");
        setS(data.settings);
        setMsg({ kind: "ok", text: t("codeImported") });
      }
    } catch (e) {
      const key = (e as Error).message;
      setMsg({ kind: "error", text: key === "invalidCode" || key.startsWith("api") ? t(key) : t("somethingFailed") });
    } finally {
      setBusy(null);
    }
  }

  const half = 30; // el lienzo muestra ±30 unidades
  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">{t("pips")}</h2>
          <Slider k="pip_width" label={t("thickness")} s={s} set={setNum} />
          <Slider k="pip_height" label={t("length")} s={s} set={setNum} />
          <Slider k="pip_gap" label={t("centerGap")} s={s} set={setNum} />
          <Slider k="pip_opacity" label={t("opacity")} s={s} set={setNum} />
          <Toggle label={t("staticGap")} checked={s.pip_gap_static} onChange={(v) => setS((p) => ({ ...p, pip_gap_static: v }))} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">{t("pipOutline")}</h2>
          <Slider k="pip_outline_border" label={t("thickness")} s={s} set={setNum} />
          <Slider k="pip_outline_gap" label={t("gap")} s={s} set={setNum} />
          <Slider k="pip_outline_opacity" label={t("opacity")} s={s} set={setNum} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">{t("dot")}</h2>
          <Slider k="dot_size" label={t("size")} s={s} set={setNum} />
          <Slider k="dot_opacity" label={t("opacity")} s={s} set={setNum} />
          <Slider k="dot_outline_border" label={t("outlineThickness")} s={s} set={setNum} />
          <Slider k="dot_outline_gap" label={t("outlineGap")} s={s} set={setNum} />
          <Slider k="dot_outline_opacity" label={t("outlineOpacity")} s={s} set={setNum} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">{t("color")}</h2>
          <Color label={t("color")} rgb={[s.color_r, s.color_g, s.color_b]} onChange={([r, g, b]) => setS((p) => ({ ...p, color_r: r, color_g: g, color_b: b }))} />
          <Color label={t("outlineColor")} rgb={[s.outline_color_r, s.outline_color_g, s.outline_color_b]} onChange={([r, g, b]) => setS((p) => ({ ...p, outline_color_r: r, outline_color_g: g, outline_color_b: b }))} />
          <Toggle label={t("teamColor")} checked={s.themed} onChange={(v) => setS((p) => ({ ...p, themed: v }))} />
        </Card>
        <Button variant="ghost" onClick={() => setS(DEFAULTS)}>{t("resetDefaults")}</Button>
      </div>

      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black">{t("preview")}</h2>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("previewBg")}>
              {BACKGROUNDS.map((b) => (
                <button key={b.id} type="button" role="radio" aria-checked={bg === b.id} onClick={() => setBg(b.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${bg === b.id ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>
                  <span aria-hidden className={`size-3 rounded-full border border-brass/50 ${b.cls}`} />{t(b.label)}
                </button>
              ))}
            </div>
          </div>
          <div className={`relative aspect-video w-full overflow-hidden rounded-md border border-brass/40 ${BACKGROUNDS.find((x) => x.id === bg)!.cls}`}>
            <svg viewBox={`${-half * 1.78} ${-half} ${half * 2 * 1.78} ${half * 2}`} role="img" aria-label={t("previewAria")} className="absolute inset-0 h-full w-full" style={{ transform: `scale(${zoom / 6})` }} shapeRendering="crispEdges">
              {shapes.pipOutlines.map((r, i) => <rect key={`o${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke={outline} strokeOpacity={s.pip_outline_opacity} strokeWidth={s.pip_outline_border} />)}
              {shapes.pips.map((r, i) => <rect key={`p${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={color} fillOpacity={s.pip_opacity} />)}
              {shapes.dotOutline && <circle r={shapes.dotOutline.r} fill="none" stroke={outline} strokeOpacity={s.dot_outline_opacity} strokeWidth={s.dot_outline_border} />}
              {shapes.dot && <circle r={shapes.dot.r} fill={color} fillOpacity={s.dot_opacity} />}
            </svg>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label htmlFor="zoom" className="font-semibold">{t("zoom")}</label>
            <input id="zoom" type="range" min={2} max={16} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--brass)]" />
            <output htmlFor="zoom" className="w-8 text-right tabular-nums text-ink-muted">×{(zoom / 6).toFixed(1)}</output>
          </div>
          <p className="text-xs text-ink-muted">{t("previewNote")}</p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">{t("code")}</h2>
          <div className="space-y-2">
            <label htmlFor="import-code" className="text-sm font-semibold">{t("importCode")}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="import-code" value={imported} onChange={(e) => setImported(e.target.value)} placeholder="DL.AQDAdYkf…" spellCheck={false} autoComplete="off" className="w-full rounded-sm border border-brass/50 bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus-visible:border-brass" />
              <Button onClick={() => call("import")} disabled={busy !== null || !imported.trim()}>{busy === "import" ? t("importing") : t("import")}</Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">{t("generateTitle")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => call("code")} disabled={busy !== null}>{busy === "code" ? t("generating") : t("generate")}</Button>
              {code && <CopyButton text={code} label={t("copyCode")} />}
              <CopyButton text={() => `${location.origin}/crosshair?${query}`} label={t("copyLink")} variant="ghost" />
            </div>
            {code && <p className="break-all rounded-sm border border-brass/30 bg-bg p-2 font-mono text-xs">{code}</p>}
          </div>
          <p role={msg?.kind === "error" ? "alert" : "status"} className={`min-h-5 text-sm ${msg?.kind === "error" ? "text-rose-ink" : "text-sage-ink"}`}>{msg?.text}</p>
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black">{t("officialImage")}</h2>
            <Button variant="secondary" onClick={() => setOfficial((v) => !v)}>{official ? t("hide") : t("seeOfficial")}</Button>
          </div>
          {official ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen dinámica de nuestra propia ruta; no pasa por el optimizador
            <img src={`/api/crosshair/image?${query}&scale=${Math.max(1, Math.round(zoom / 2))}`} alt={t("officialAlt")} className="mx-auto max-h-72 rounded-md border border-brass/30 bg-night [image-rendering:pixelated]" />
          ) : (
            <p className="text-sm text-ink-muted">{t("officialNote")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
