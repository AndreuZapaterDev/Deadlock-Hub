"use client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const IOS_KEY = "pwa-ios-tip-dismissed";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
const noSubscription = () => () => {};

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: se volverá a mostrar */ } },
};

/**
 * Todo lo de la PWA en un sitio: registra el service worker (solo en producción), avisa de una nueva versión,
 * ofrece "Instalar app" (con instrucciones para iOS) y avisa cuando no hay conexión.
 */
export function Pwa() {
  const t = useTranslations("pwa");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallPrompt | null>(null);
  // useSyncExternalStore: en el servidor se asume "con conexión" y sin aviso de iOS, y no hay setState dentro del efecto.
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const iosEligible = useSyncExternalStore(
    noSubscription,
    () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      return /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone && !store.get(IOS_KEY);
    },
    () => false,
  );
  const [iosDismissed, setIosDismissed] = useState(false);
  const updateRequested = useRef(false);
  const iosTip = iosEligible && !iosDismissed;

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("appinstalled", onInstalled);

    let cancelled = false;
    let reloading = false;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const version = encodeURIComponent(process.env.NEXT_PUBLIC_APP_VERSION ?? "dev");
      navigator.serviceWorker
        .register(`/sw.js?v=${version}`)
        .then((reg) => {
          if (cancelled) return;
          if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing;
            sw?.addEventListener("statechange", () => {
              if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
            });
          });
        })
        .catch(() => { /* sin service worker la web funciona igual, solo sin modo offline */ });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Solo se recarga si el usuario pidió la nueva versión: en la primera instalación el worker toma el control sin recargar nada.
        if (!updateRequested.current || reloading) return;
        reloading = true;
        window.location.reload();
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
  }, [installEvent]);

  const btn = "rounded-sm border border-brass bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-brass/15";
  return (
    <>
      {!online && (
        <div role="status" className="fixed inset-x-0 top-0 z-50 bg-apricot px-4 py-1.5 text-center text-sm font-semibold text-night">
          {t("offlineBanner")}
        </div>
      )}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col items-start gap-2 sm:right-auto">
        {waiting && (
          <div role="status" className="flex items-center gap-3 rounded-md border border-brass bg-surface p-3 shadow-card">
            <span className="text-sm">{t("update")}</span>
            <button type="button" className={btn} onClick={() => { updateRequested.current = true; waiting.postMessage({ type: "SKIP_WAITING" }); }}>{t("reload")}</button>
          </div>
        )}
        {installEvent && <button type="button" className={btn} onClick={install}>{t("install")}</button>}
        {iosTip && (
          <div role="note" className="flex items-start gap-3 rounded-md border border-brass bg-surface p-3 text-sm shadow-card">
            <p>{t.rich("iosTip", { b: (chunks) => <strong>{chunks}</strong> })}</p>
            <button type="button" aria-label={t("close")} className="rounded-sm px-2 text-ink-muted hover:bg-brass/15 hover:text-ink" onClick={() => { store.set(IOS_KEY, "1"); setIosDismissed(true); }}>✕</button>
          </div>
        )}
      </div>
    </>
  );
}
