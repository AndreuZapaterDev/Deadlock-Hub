"use client";
import { motion } from "motion/react";

const EASE = [0.22, 0.61, 0.36, 1] as const;
const VARIANTS = {
  // sube y aparece
  rise: { hidden: { opacity: 0, y: 24 }, shown: { opacity: 1, y: 0 } },
  // telón: se despega de abajo hacia arriba, como un cartel recién pegado
  curtain: { hidden: { opacity: 0, y: 36, clipPath: "inset(14% 0 0 0)" }, shown: { opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" } },
};

/** Aparece una sola vez al entrar en pantalla. `delay` en segundos para escalonar. Respeta prefers-reduced-motion (MotionConfig). */
export function Reveal({ children, delay = 0, variant = "rise", className }: { children: React.ReactNode; delay?: number; variant?: keyof typeof VARIANTS; className?: string }) {
  return (
    <motion.div className={className} variants={VARIANTS[variant]} initial="hidden" whileInView="shown" viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}
