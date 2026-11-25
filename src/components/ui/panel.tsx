/** Bloque con título: rombo de latón y título en serif sobre un filete, para que cada lista o gráfica se lea como una unidad. */
export function Panel({ title, hint, aside, children, className = "" }: { title: string; hint?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-3 rounded-md border border-brass/30 bg-brass/[0.06] p-3 sm:p-4 ${className}`}>
      <div className="flex items-start gap-2.5 border-b border-brass/30 pb-2.5">
        <span aria-hidden className="mt-2 size-2 shrink-0 rotate-45 bg-brass" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-black leading-tight">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}
