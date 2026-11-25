"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const COOLDOWN_MS = 10 * 60 * 1000; // `force_refetch` admite unas 5 peticiones por hora y clave: se pide con mucha moderación
const key = (id: number) => `refresh-${id}`;

function lastRefresh(id: number): number {
  try { return Number(localStorage.getItem(key(id))) || 0; } catch { return 0; }
}

/** "Actualizar historial": solo bajo petición expresa y con cooldown visible. Nunca se lanza solo. */
export function RefreshButton({ accountId }: { accountId: number }) {
  const t = useTranslations("players");
  const router = useRouter();
  const [left, setLeft] = useState(0); // ms de espera restantes
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, lastRefresh(accountId) + COOLDOWN_MS - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [accountId]);

  async function refresh() {
    setBusy(true); setError(false);
    try {
      const res = await fetch(`/api/players/${accountId}/refresh`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      try { localStorage.setItem(key(accountId), String(Date.now())); } catch { /* sin almacenamiento: no hay cooldown persistente */ }
      setLeft(COOLDOWN_MS);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  return (
    <div className="space-y-1">
      <Button variant="secondary" onClick={refresh} disabled={busy || left > 0}>
        {busy ? t("refreshing") : left > 0 ? t("availableIn", { time: `${mm}:${ss}` }) : t("refreshHistory")}
      </Button>
      {error && <p role="alert" className="text-xs text-rose-ink">{t("refreshError")}</p>}
    </div>
  );
}
