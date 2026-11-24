"use client";
import { motion } from "motion/react";

const EASE = [0.22, 0.61, 0.36, 1] as const;

/** Título de sección: el rombo gira hasta su sitio y el filete se dibuja de izquierda a derecha al entrar en pantalla. */
export function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <motion.h2 id={id} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "-60px" }} className="flex scroll-mt-40 items-center gap-3 font-display text-2xl font-black">
      <motion.span aria-hidden className="size-2.5 bg-brass" variants={{ hidden: { scale: 0, rotate: 0 }, shown: { scale: 1, rotate: 45 } }} transition={{ duration: 0.5, ease: EASE }} />
      <motion.span variants={{ hidden: { opacity: 0, x: -8 }, shown: { opacity: 1, x: 0 } }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }}>{children}</motion.span>
      <motion.span aria-hidden className="h-px flex-1 origin-left bg-linear-to-r from-brass/60 to-transparent" variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }} transition={{ duration: 0.9, delay: 0.2, ease: EASE }} />
    </motion.h2>
  );
}
