"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string };

/**
 * Menú al estilo del juego: la fila resaltada (crema con texto oscuro en Noche) se desliza con un resorte
 * hasta la entrada sobre la que está el ratón o el foco, y vuelve a la página activa al salir.
 */
export function NavMenu({ items }: { items: Item[] }) {
  const path = usePathname();
  const [hover, setHover] = useState<string | null>(null);
  const active = items.find((i) => path === i.href || path.startsWith(`${i.href}/`))?.href ?? null;
  const lit = hover ?? active;

  return (
    <ul className="flex gap-0.5 whitespace-nowrap" onMouseLeave={() => setHover(null)}>
      {items.map((i) => (
        <li key={i.href} className="relative">
          {lit === i.href && (
            <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-sm bg-ink" transition={{ type: "spring", stiffness: 520, damping: 38 }} />
          )}
          <Link
            href={i.href}
            aria-current={active === i.href ? "page" : undefined}
            onMouseEnter={() => setHover(i.href)}
            onFocus={() => setHover(i.href)}
            onBlur={() => setHover(null)}
            className={`relative z-10 inline-block px-3 py-1.5 font-serif text-[15px] font-bold transition-colors duration-150 ${lit === i.href ? "text-bg" : ""}`}
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
