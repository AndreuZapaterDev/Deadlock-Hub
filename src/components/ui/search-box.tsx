import { cn } from "@/lib/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("w-full rounded-sm border border-brass/50 bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:border-brass", className)}
      {...props}
    />
  );
}

/** Buscador de jugadores: formulario GET a /players (el autocompletado llega en la fase 3). */
export function SearchBox({ className, label, placeholder }: { className?: string; label: string; placeholder: string }) {
  return (
    <form action="/players" role="search" className={cn("relative", className)}>
      <label htmlFor="player-search" className="sr-only">{label}</label>
      <Input id="player-search" name="q" type="search" placeholder={placeholder} autoComplete="off" className="pr-10" />
      <button type="submit" aria-label={label} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-brass hover:bg-brass/15">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="7" cy="7" r="5" /><path d="M11 11l4 4" />
        </svg>
      </button>
    </form>
  );
}
