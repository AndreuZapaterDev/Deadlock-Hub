/** Clases de un botón en forma de píldora para filtros y pestañas de navegación: activo = relleno oscuro, inactivo = solo borde. */
export function pillClass(active: boolean, size: "md" | "sm" = "md") {
  return `rounded-full border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${size === "sm" ? "px-3 py-1 text-sm" : "px-4 py-1.5 text-sm"} ${active ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`;
}
