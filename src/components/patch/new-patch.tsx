"use client";
import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";

const KEY = "seen-patch";
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const subscribe = (cb: () => void) => { window.addEventListener("seen-patch-changed", cb); window.addEventListener("storage", cb); return () => { window.removeEventListener("seen-patch-changed", cb); window.removeEventListener("storage", cb); }; };

/** Insignia «Nuevo» mientras el último parche publicado no se haya visto (se recuerda en este navegador; sin servidor ni cuentas). */
export function NewPatchBadge({ id }: { id: string }) {
  const t = useTranslations("home");
  const seen = useSyncExternalStore(subscribe, read, () => id);
  if (seen === id) return null;
  return <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wider text-on-accent">{t("newBadge")}</span>;
}

/** Se monta en /patches: marca el último parche como visto. */
export function MarkPatchSeen({ id }: { id: string }) {
  useEffect(() => {
    try { localStorage.setItem(KEY, id); } catch { /* sin almacenamiento: la insignia seguirá visible */ }
    window.dispatchEvent(new Event("seen-patch-changed"));
  }, [id]);
  return null;
}
