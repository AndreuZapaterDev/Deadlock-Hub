"use client";
import { useId, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { crosshairShapes, DEFAULTS, fromHex, isValidCode, RANGES, toHex, toQuery, type CrosshairSettings } from "@/lib/crosshair";

type NumKey = keyof typeof RANGES;

const BACKGROUNDS = [
  { id: "night", label: "Noche", cls: "bg-night" },
  { id: "cream", label: "Claro", cls: "bg-cream" },
  { id: "poster", label: "Verde", cls: "bg-poster" },
  { id: "sage", label: "Lima", cls: "bg-sage" },
  { id: "accent", label: "Rojo", cls: "bg-accent" },
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
        if (!res.ok) throw new Error(data.error ?? "Error");
        setCode(data.code);
        setMsg({ kind: "ok", text: "Código generado." });
      } else {
        if (!isValidCode(imported.trim())) throw new Error("El código no tiene un formato válido (debe empezar por DL.).");
        const res = await fetch(`/api/crosshair/settings?code=${encodeURIComponent(imported.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error");
        setS(data.settings);
        setMsg({ kind: "ok", text: "Código importado: los ajustes se han aplicado." });
      }
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message || "Algo ha fallado. Inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  const half = 30; // el lienzo muestra ±30 unidades
  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Barras</h2>
          <Slider k="pip_width" label="Grosor" s={s} set={setNum} />
          <Slider k="pip_height" label="Longitud" s={s} set={setNum} />
          <Slider k="pip_gap" label="Hueco central" s={s} set={setNum} />
          <Slider k="pip_opacity" label="Opacidad" s={s} set={setNum} />
          <Toggle label="Hueco fijo al disparar" checked={s.pip_gap_static} onChange={(v) => setS((p) => ({ ...p, pip_gap_static: v }))} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Contorno de las barras</h2>
          <Slider k="pip_outline_border" label="Grosor" s={s} set={setNum} />
          <Slider k="pip_outline_gap" label="Separación" s={s} set={setNum} />
          <Slider k="pip_outline_opacity" label="Opacidad" s={s} set={setNum} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Punto central</h2>
          <Slider k="dot_size" label="Tamaño" s={s} set={setNum} />
          <Slider k="dot_opacity" label="Opacidad" s={s} set={setNum} />
          <Slider k="dot_outline_border" label="Grosor del contorno" s={s} set={setNum} />
          <Slider k="dot_outline_gap" label="Separación del contorno" s={s} set={setNum} />
          <Slider k="dot_outline_opacity" label="Opacidad del contorno" s={s} set={setNum} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Color</h2>
          <Color label="Color" rgb={[s.color_r, s.color_g, s.color_b]} onChange={([r, g, b]) => setS((p) => ({ ...p, color_r: r, color_g: g, color_b: b }))} />
          <Color label="Color del contorno" rgb={[s.outline_color_r, s.outline_color_g, s.outline_color_b]} onChange={([r, g, b]) => setS((p) => ({ ...p, outline_color_r: r, outline_color_g: g, outline_color_b: b }))} />
          <Toggle label="Usar el color del equipo" checked={s.themed} onChange={(v) => setS((p) => ({ ...p, themed: v }))} />
        </Card>
        <Button variant="ghost" onClick={() => setS(DEFAULTS)}>Restablecer valores por defecto</Button>
      </div>

      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black">Vista previa</h2>
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Fondo de la vista previa">
              {BACKGROUNDS.map((b) => (
                <button key={b.id} type="button" role="radio" aria-checked={bg === b.id} onClick={() => setBg(b.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${bg === b.id ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>
                  <span aria-hidden className={`size-3 rounded-full border border-brass/50 ${b.cls}`} />{b.label}
                </button>
              ))}
            </div>
          </div>
          <div className={`relative aspect-video w-full overflow-hidden rounded-md border border-brass/40 ${BACKGROUNDS.find((x) => x.id === bg)!.cls}`}>
            <svg viewBox={`${-half * 1.78} ${-half} ${half * 2 * 1.78} ${half * 2}`} role="img" aria-label="Vista previa del crosshair" className="absolute inset-0 h-full w-full" style={{ transform: `scale(${zoom / 6})` }} shapeRendering="crispEdges">
              {shapes.pipOutlines.map((r, i) => <rect key={`o${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke={outline} strokeOpacity={s.pip_outline_opacity} strokeWidth={s.pip_outline_border} />)}
              {shapes.pips.map((r, i) => <rect key={`p${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={color} fillOpacity={s.pip_opacity} />)}
              {shapes.dotOutline && <circle r={shapes.dotOutline.r} fill="none" stroke={outline} strokeOpacity={s.dot_outline_opacity} strokeWidth={s.dot_outline_border} />}
              {shapes.dot && <circle r={shapes.dot.r} fill={color} fillOpacity={s.dot_opacity} />}
            </svg>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label htmlFor="zoom" className="font-semibold">Zoom</label>
            <input id="zoom" type="range" min={2} max={16} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--brass)]" />
            <output htmlFor="zoom" className="w-8 text-right tabular-nums text-ink-muted">×{(zoom / 6).toFixed(1)}</output>
          </div>
          <p className="text-xs text-ink-muted">Vista previa aproximada que se dibuja aquí y responde al instante. La imagen oficial (abajo) la genera la API. «Usar el color del equipo» no se refleja en la vista previa.</p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Código</h2>
          <div className="space-y-2">
            <label htmlFor="import-code" className="text-sm font-semibold">Importar un código</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="import-code" value={imported} onChange={(e) => setImported(e.target.value)} placeholder="DL.AQDAdYkf…" spellCheck={false} autoComplete="off" className="w-full rounded-sm border border-brass/50 bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus-visible:border-brass" />
              <Button onClick={() => call("import")} disabled={busy !== null || !imported.trim()}>{busy === "import" ? "Importando…" : "Importar"}</Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Generar el código de estos ajustes</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => call("code")} disabled={busy !== null}>{busy === "code" ? "Generando…" : "Generar código"}</Button>
              {code && <CopyButton text={code} label="Copiar código" />}
              <CopyButton text={() => `${location.origin}/crosshair?${query}`} label="Copiar enlace de este crosshair" variant="ghost" />
            </div>
            {code && <p className="break-all rounded-sm border border-brass/30 bg-bg p-2 font-mono text-xs">{code}</p>}
          </div>
          <p role={msg?.kind === "error" ? "alert" : "status"} className={`min-h-5 text-sm ${msg?.kind === "error" ? "text-rose-ink" : "text-sage-ink"}`}>{msg?.text}</p>
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black">Imagen oficial</h2>
            <Button variant="secondary" onClick={() => setOfficial((v) => !v)}>{official ? "Ocultar" : "Ver imagen oficial"}</Button>
          </div>
          {official ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen dinámica de nuestra propia ruta; no pasa por el optimizador
            <img src={`/api/crosshair/image?${query}&scale=${Math.max(1, Math.round(zoom / 2))}`} alt="Crosshair generado por la API con los ajustes actuales" className="mx-auto max-h-72 rounded-md border border-brass/30 bg-night [image-rendering:pixelated]" />
          ) : (
            <p className="text-sm text-ink-muted">Se pide a la API solo cuando la pides (no con cada cambio).</p>
          )}
        </Card>
      </div>
    </div>
  );
}
