import { Sigil } from "@/components/deco";
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse-soft rounded-sm bg-ink/10", className)} />;
}

export function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-md border border-dashed border-brass/50 px-6 py-10 text-center">
      <Sigil className="absolute -right-6 -top-6 h-40 w-40 opacity-15" />
      <p className="font-serif text-lg">{title}</p>
      {hint && <p className="max-w-md text-sm text-ink-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-md border border-rose bg-rose/25 px-5 py-4">
      <p className="font-semibold text-rose-ink">{title}</p>
      {hint && <p className="text-sm text-ink">{hint}</p>}
      {children}
    </div>
  );
}

