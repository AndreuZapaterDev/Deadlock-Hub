/** Aviso discreto que solo aparece en modo mock (se quita solo con DATA_SOURCE=api). Explica qué limitación de los datos de ejemplo afecta a la sección. */
export function DemoNote({ children }: { children: React.ReactNode }) {
  if (process.env.DATA_SOURCE === "api") return null;
  return (
    <p className="rounded-sm border border-brass/40 bg-brass/10 px-4 py-2 text-xs leading-relaxed text-ink-muted">
      <span className="font-semibold text-ink">Modo demo.</span> {children}
    </p>
  );
}
