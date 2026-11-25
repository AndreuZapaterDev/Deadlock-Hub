import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import type { ProfileState } from "@/lib/player-stats";

// Claves de los textos en los mensajes («players.problem<Estado>Title» y «…Hint»)
const COPY: Record<Exclude<ProfileState, "ok">, { title: string; hint: string }> = {
  private: { title: "problemPrivateTitle", hint: "problemPrivateHint" },
  notfound: { title: "problemNotFoundTitle", hint: "problemNotFoundHint" },
  busy: { title: "problemBusyTitle", hint: "problemBusyHint" },
  error: { title: "problemErrorTitle", hint: "problemErrorHint" },
};

/** Mensaje claro (nunca un error genérico) para los perfiles o partidas que no se pueden mostrar. */
export function ProfileProblem({ state, subject, backHref = "/players", backLabel }: { state: Exclude<ProfileState, "ok">; subject?: string; backHref?: string; backLabel?: string }) {
  const t = useTranslations("players");
  const c = COPY[state];
  return (
    <div className="mx-auto max-w-2xl space-y-5 py-10">
      <ErrorState title={t(c.title)} hint={t(c.hint)}>
        {subject && <p className="mt-1 text-xs text-ink-muted">{subject}</p>}
      </ErrorState>
      <div className="flex flex-wrap gap-3">
        <Button href={backHref}>{backLabel ?? t("backToSearch")}</Button>
        {state === "busy" && <Link href="" className="link-brass self-center text-sm font-semibold">{t("retry")}</Link>}
      </div>
    </div>
  );
}
