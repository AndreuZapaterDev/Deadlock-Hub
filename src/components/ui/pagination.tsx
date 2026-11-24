import Link from "next/link";
import { cn } from "@/lib/cn";

/** Paginación por enlaces (sirve en Server Components): la página va en la URL. */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-sm border px-2 text-sm";
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-1">
      {page > 1 && <Link href={href(page - 1)} className={cn(item, "border-brass/40 hover:bg-brass/15")} aria-label="Página anterior">←</Link>}
      {nums.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - nums[i - 1] > 1 && <span className="px-1 text-ink-muted">…</span>}
          <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page ? "border-brass bg-lilac font-semibold" : "border-brass/40 hover:bg-brass/15")}>
            {p}
          </Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className={cn(item, "border-brass/40 hover:bg-brass/15")} aria-label="Página siguiente">→</Link>}
    </nav>
  );
}
