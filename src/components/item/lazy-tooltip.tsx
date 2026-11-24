"use client";
import { useState } from "react";
import { ItemTooltipView, type TooltipData } from "@/components/item/item-tooltip";
import { cn } from "@/lib/cn";

// Cache del navegador por objeto (y por idioma, que va en la clave): cada tooltip se pide como mucho una vez.
const cache = new Map<string, TooltipData>();
const pending = new Map<string, Promise<TooltipData>>();

function load(cls: string, lang: string): Promise<TooltipData> {
  const key = `${lang}:${cls}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = fetch(`/api/items/${encodeURIComponent(cls)}/tooltip`)
      .then((r) => (r.ok ? (r.json() as Promise<TooltipData>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => { cache.set(key, data); return data; })
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}

/**
 * Tooltip rico de un objeto que se descarga la primera vez que se pasa el ratón o se enfoca (con teclado o al tocar).
 * Misma apariencia y mismo comportamiento CSS que `RichTooltip`, pero sin llevar los 156 tooltips en el HTML.
 */
export function LazyItemTooltip({ id, cls, lang, children, fill }: { id: string; cls: string; lang: string; children: React.ReactNode; fill?: boolean }) {
  const [data, setData] = useState<TooltipData | null>(() => cache.get(`${lang}:${cls}`) ?? null);
  const [failed, setFailed] = useState(false);

  const ensure = () => {
    if (data) return;
    load(cls, lang).then(setData, () => setFailed(true));
  };

  return (
    <span className={cn("group relative", fill ? "block" : "inline-block")} onPointerEnter={ensure} onFocusCapture={ensure}>
      <span aria-describedby={id} className={cn("rounded-sm", fill ? "block" : "inline-block")}>{children}</span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 translate-y-1 rounded-md border border-brass bg-surface p-3 text-left opacity-0 shadow-pop transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
      >
        {data ? <ItemTooltipView data={data} /> : <span className="text-xs text-ink-muted">{failed ? "No se ha podido cargar." : "Cargando…"}</span>}
      </span>
    </span>
  );
}
