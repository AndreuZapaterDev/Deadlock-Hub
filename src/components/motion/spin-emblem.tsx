"use client";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { Emblem } from "@/components/deco";

/** La rueda gira con el scroll (como un timón) y da un giro extra con resorte al pasar el ratón. */
export function SpinEmblem({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const turn = useSpring(useTransform(scrollY, [0, 1200], [0, 160]), { stiffness: 80, damping: 20 });
  return (
    <motion.div style={{ rotate: reduced ? 0 : turn }}>
      <motion.div whileHover={reduced ? undefined : { rotate: 45 }} transition={{ type: "spring", stiffness: 140, damping: 10 }}>
        <Emblem className={className} />
      </motion.div>
    </motion.div>
  );
}
