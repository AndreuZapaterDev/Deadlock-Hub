import { cn } from "@/lib/cn";

/**
 * Tooltip rico sin JS: aparece con hover y con foco de teclado (focus-within).
 * `children` es el disparador (debe ser enfocable); `content`, el panel.
 */
export function RichTooltip({ id, content, children, className, focusable = true, fill }: { id: string; content: React.ReactNode; children: React.ReactNode; className?: string; focusable?: boolean; fill?: boolean }) {
  return (
    <span className={cn("group relative", fill ? "block" : "inline-block", className)}>
      <span tabIndex={focusable ? 0 : undefined} aria-describedby={id} className={cn("rounded-sm", fill ? "block" : "inline-block")}>{children}</span>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 translate-y-1 rounded-md border border-brass bg-surface p-3 text-left opacity-0 shadow-pop transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
