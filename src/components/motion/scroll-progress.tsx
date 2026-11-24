"use client";
import { motion, useScroll, useSpring } from "motion/react";

/** Hilo de oro en el borde inferior de la cabecera que crece con el scroll. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden style={{ scaleX }} className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-brass" />;
}
