import { cn } from "@/lib/cn";

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** `sm` para barras estrechas (encabezado, ordenar por…). */
  size?: "md" | "sm";
  /** Clase del contenedor (ancho, márgenes). La del `<select>` en sí va en `className`. */
  wrapperClassName?: string;
};

/**
 * Desplegable de la web. Es un `<select>` nativo (teclado, lectores de pantalla y móvil funcionan como siempre) con otro aspecto:
 * sin la flecha del sistema, con un «ojal» dorado a la derecha que lleva el chevron, borde de latón que se enciende al pasar el
 * ratón y al enfocar, y el valor «vacío» («Todos», «Cualquiera»…) en tono apagado para distinguir qué filtros están activos.
 * La lista desplegada usa los colores del tema (reglas `select option` de globals.css).
 */
export function Select({ className, wrapperClassName, size = "md", children, value, ...props }: Props) {
  const empty = value === "" || value === undefined ? props.defaultValue === undefined || props.defaultValue === "" : false;
  return (
    <span className={cn("select-wrap group relative inline-flex min-w-0", wrapperClassName)}>
      <select
        value={value}
        className={cn(
          "peer w-full min-w-0 cursor-pointer appearance-none truncate rounded-sm border border-brass/45 bg-panel text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors",
          "hover:border-brass hover:bg-brass/5 focus-visible:border-brass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
          "disabled:cursor-not-allowed disabled:opacity-55",
          size === "sm" ? "h-8 pl-2.5 pr-9 text-xs" : "h-[2.375rem] pl-3 pr-10 text-sm", // misma altura que los campos de texto (Input: 38 px)
          empty ? "font-normal text-ink-muted" : "font-semibold",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {/* Ojal con el chevron: separado por un filete dorado, como el selector de modo de juego del juego. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-px right-px flex items-center justify-center rounded-r-[1px] border-l border-brass/30 bg-brass/10 text-brass transition-colors",
          "group-hover:bg-brass/20 peer-focus-visible:bg-brass/25 peer-disabled:opacity-55",
          size === "sm" ? "w-7" : "w-8",
        )}
      >
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </span>
    </span>
  );
}
