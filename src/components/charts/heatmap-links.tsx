"use client";
import { useRouter } from "next/navigation";

/**
 * Navegación sin recarga para los enlaces de un bloque grande (la matriz de counters tiene 1.936 celdas). Cada `<Link>` de Next es un
 * componente de cliente que se hidrata por separado: 1.936 de ellos eran ~600 ms de bloqueo en un móvil. Aquí las celdas son `<a>`
 * normales dentro de un Server Component y este único manejador intercepta el clic y navega con el router, sin perder el scroll.
 * Con clic con modificadores (nueva pestaña) o sin JavaScript, el enlace funciona como cualquier otro.
 */
export function DelegatedLinks({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-nav]");
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.push(a.getAttribute("href") ?? "/", { scroll: false });
      }}
    >
      {children}
    </div>
  );
}
